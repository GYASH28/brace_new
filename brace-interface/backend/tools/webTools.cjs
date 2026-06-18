const DEFAULT_TIMEOUT_MS = 15000;

async function readCappedText(response, maxBytes) {
  if (!response.body?.getReader) {
    const text = await response.text();
    return { text: text.slice(0, maxBytes), truncated: text.length > maxBytes };
  }

  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  let truncated = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = Buffer.from(value);
    const remaining = maxBytes - total;
    if (chunk.length > remaining) {
      if (remaining > 0) chunks.push(chunk.subarray(0, remaining));
      truncated = true;
      await reader.cancel();
      break;
    }
    chunks.push(chunk);
    total += chunk.length;
  }

  return { text: Buffer.concat(chunks).toString("utf8"), truncated };
}

async function fetchText(url, maxBytes = 150000, timeoutMs = DEFAULT_TIMEOUT_MS) {
  if (!/^https?:\/\//i.test(url || "")) throw new Error("Only http/https URLs are supported.");
  const byteLimit = Math.max(1024, Math.min(Number(maxBytes) || 150000, 500000));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(1000, Number(timeoutMs) || DEFAULT_TIMEOUT_MS));

  try {
    const response = await fetch(url, { redirect: "follow", signal: controller.signal });
    const { text, truncated } = await readCappedText(response, byteLimit);
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${text.slice(0, 200)}`);
    return { ok: true, url: response.url, status: response.status, text, truncated };
  } catch (error) {
    if (error.name === "AbortError") throw new Error(`Fetch timed out after ${timeoutMs}ms.`);
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { fetchText };
