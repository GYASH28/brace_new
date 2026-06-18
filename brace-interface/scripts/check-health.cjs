const http = require("node:http");

const host = process.env.BRACE_HOST || "127.0.0.1";
const port = Number(process.env.BRACE_BACKEND_PORT || 8787);

function request(pathname) {
  return new Promise((resolve, reject) => {
    const req = http.get({ host, port, path: pathname, timeout: 15000 }, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        body += chunk;
      });
      res.on("end", () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ statusCode: res.statusCode, body: parsed });
        } catch {
          reject(new Error(`Invalid JSON from ${pathname}: ${body.slice(0, 120)}`));
        }
      });
    });
    req.on("timeout", () => {
      req.destroy(new Error(`${pathname} timed out.`));
    });
    req.on("error", reject);
  });
}

(async () => {
  const checks = ["/health", "/api/status", "/api/assistant/status", "/api/voice/status", "/api/greeting/startup", "/api/memory/status", "/api/memory"];
  for (const pathname of checks) {
    const result = await request(pathname);
    if (result.statusCode < 200 || result.statusCode >= 300 || !result.body?.ok) {
      throw new Error(`${pathname} failed: HTTP ${result.statusCode} ${JSON.stringify(result.body)}`);
    }
    console.log(`${pathname}: ok`);
  }
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
