const { redactSecrets } = require("../../security/secretScanner.cjs");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function joinText(parts = []) {
  return parts.map((part) => part?.text || "").join("").trim();
}

function extractFunctionCalls(parts = []) {
  return parts
    .filter((part) => part?.functionCall?.name)
    .map((part) => ({ name: part.functionCall.name, args: part.functionCall.args || {} }));
}

class GeminiProvider {
  constructor({
    apiKey,
    model = "gemini-2.5-flash",
    fallbackModel = "gemini-2.5-flash-lite",
    timeoutMs = 60000,
    maxRetries = 2,
    temperature = 0.35,
    maxTokens = 1200,
    fetchImpl = globalThis.fetch,
  } = {}) {
    this.apiKey = apiKey;
    this.model = model;
    this.fallbackModel = fallbackModel;
    const parsedTimeout = Number(timeoutMs);
    const parsedRetries = Number(maxRetries);
    this.timeoutMs = Math.max(1000, Math.min(Number.isFinite(parsedTimeout) ? parsedTimeout : 60000, 60000));
    this.maxRetries = Math.max(0, Math.min(Number.isFinite(parsedRetries) ? Math.floor(parsedRetries) : 2, 3));
    this.temperature = temperature;
    this.maxTokens = maxTokens;
    this.fetchImpl = fetchImpl;
  }

  status() {
    return {
      ok: true,
      provider: "gemini",
      configured: Boolean(this.apiKey),
      model: this.model,
      fallbackModel: this.fallbackModel,
    };
  }

  buildContents({ userMessage, systemPrompt, conversation = [], memorySummary = "", toolResults = [] }) {
    const contents = [];
    const contextParts = [
      systemPrompt,
      memorySummary ? `Relevant memory:\n${memorySummary}` : "",
      "Never reveal secrets. If a tool is unavailable or denied, say that clearly.",
    ].filter(Boolean);

    if (contextParts.length) {
      contents.push({ role: "user", parts: [{ text: contextParts.join("\n\n") }] });
      contents.push({ role: "model", parts: [{ text: "Understood. I will answer as B.R.A.C.E and use tools only when helpful." }] });
    }

    for (const message of conversation.slice(-12)) {
      if (!message?.text) continue;
      contents.push({
        role: message.role === "assistant" ? "model" : "user",
        parts: [{ text: redactSecrets(String(message.text).slice(0, 4000)) }],
      });
    }

    for (const result of toolResults) {
      contents.push({
        role: "user",
        parts: [{ text: `Tool result for ${result.name}: ${JSON.stringify(redactSecrets(result.result)).slice(0, 4000)}` }],
      });
    }

    contents.push({ role: "user", parts: [{ text: redactSecrets(userMessage || "") }] });
    return contents;
  }

  async generate(input) {
    if (!this.apiKey) {
      const error = new Error("Gemini API key is missing. Add GEMINI_API_KEY or save a Gemini key in Settings.");
      error.code = "MISSING_GEMINI_API_KEY";
      throw error;
    }

    const models = [this.model, this.fallbackModel].filter((value, index, array) => value && array.indexOf(value) === index);
    let lastError;
    for (const model of models) {
      try {
        return await this.tryModel(model, input);
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError;
  }

  async tryModel(model, input) {
    let attempt = 0;
    while (attempt <= this.maxRetries) {
      try {
        const data = await this.request(model, input);
        const candidate = data?.candidates?.[0]?.content;
        const parts = candidate?.parts || [];
        return {
          provider: "gemini",
          model,
          text: joinText(parts),
          functionCalls: extractFunctionCalls(parts),
          raw: data,
        };
      } catch (error) {
        if (attempt >= this.maxRetries || !["GEMINI_RATE_LIMIT", "GEMINI_TIMEOUT", "GEMINI_HTTP_503"].includes(error.code)) throw error;
        await sleep(250 * 2 ** attempt);
        attempt += 1;
      }
    }
    throw new Error("Gemini request failed.");
  }

  async request(model, input) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    const body = {
      contents: this.buildContents(input),
      generationConfig: {
        temperature: this.temperature,
        maxOutputTokens: this.maxTokens,
      },
    };
    if (input.toolDeclarations?.length) {
      body.tools = [{ functionDeclarations: input.toolDeclarations }];
    }

    try {
      const response = await this.fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": this.apiKey },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      const data = await response.json();
      if (!response.ok) {
        const error = new Error(data?.error?.message || `Gemini HTTP ${response.status}`);
        error.code = response.status === 429 ? "GEMINI_RATE_LIMIT" : response.status === 503 ? "GEMINI_HTTP_503" : `GEMINI_HTTP_${response.status}`;
        throw error;
      }
      return data;
    } catch (error) {
      if (error.name === "AbortError") {
        const timeout = new Error("Gemini request timed out.");
        timeout.code = "GEMINI_TIMEOUT";
        throw timeout;
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
}

module.exports = { GeminiProvider };
