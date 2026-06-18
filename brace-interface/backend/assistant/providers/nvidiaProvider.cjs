const { redactSecrets } = require("../../security/secretScanner.cjs");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractFunctionCalls(message) {
  const calls = message.tool_calls || [];
  return calls
    .filter((call) => call.type === "function")
    .map((call) => {
      let args = {};
      try { args = JSON.parse(call.function.arguments); } catch (e) {}
      return { name: call.function.name, args, id: call.id };
    });
}

class NvidiaProvider {
  constructor({
    apiKey,
    baseUrl = "https://integrate.api.nvidia.com/v1",
    model = "meta/llama-3.1-70b-instruct",
    fallbackModel = "meta/llama-3.1-8b-instruct",
    timeoutMs = 60000,
    maxRetries = 2,
    temperature = 0.35,
    maxTokens = 1200,
    fetchImpl = globalThis.fetch,
  } = {}) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
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
      provider: "nvidia",
      configured: Boolean(this.apiKey),
      model: this.model,
      fallbackModel: this.fallbackModel,
    };
  }

  buildMessages({ userMessage, systemPrompt, conversation = [], memorySummary = "", toolResults = [] }) {
    const messages = [];
    const contextParts = [
      systemPrompt,
      memorySummary ? `Relevant memory:\n${memorySummary}` : "",
      "Never reveal secrets. If a tool is unavailable or denied, say that clearly.",
    ].filter(Boolean);

    if (contextParts.length) {
      messages.push({ role: "system", content: contextParts.join("\n\n") });
    }

    for (const message of conversation.slice(-12)) {
      if (!message?.text && !message?.toolCalls) continue;
      messages.push({
        role: message.role === "assistant" ? "assistant" : "user",
        content: redactSecrets(String(message.text || "").slice(0, 4000)),
      });
    }

    for (const result of toolResults) {
      messages.push({
        role: "user",
        content: `Tool result for ${result.name}: ${JSON.stringify(redactSecrets(result.result)).slice(0, 4000)}`
      });
    }

    messages.push({ role: "user", content: redactSecrets(userMessage || "") });
    return messages;
  }

  formatTools(geminiTools) {
    if (!geminiTools || !geminiTools.length) return undefined;
    const openAiTools = [];
    for (const func of geminiTools) {
      openAiTools.push({
        type: "function",
        function: {
          name: func.name,
          description: func.description,
          parameters: func.parameters || { type: "object", properties: {} }
        }
      });
    }
    return openAiTools.length ? openAiTools : undefined;
  }

  async generate(input) {
    if (!this.apiKey) {
      const error = new Error("NVIDIA API key is missing. Add BRACE_NVIDIA_API_KEY to your environment.");
      error.code = "MISSING_NVIDIA_API_KEY";
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
        const message = data?.choices?.[0]?.message || {};
        return {
          provider: "nvidia",
          model,
          text: message.content || "",
          functionCalls: extractFunctionCalls(message),
          raw: data,
        };
      } catch (error) {
        if (attempt >= this.maxRetries || !["NVIDIA_RATE_LIMIT", "NVIDIA_TIMEOUT", "NVIDIA_HTTP_503"].includes(error.code)) throw error;
        await sleep(250 * 2 ** attempt);
        attempt += 1;
      }
    }
    throw new Error("NVIDIA request failed.");
  }

  async request(model, input) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    const body = {
      model: model,
      messages: this.buildMessages(input),
      temperature: this.temperature,
      max_tokens: this.maxTokens,
      stream: false
    };

    if (input.toolDeclarations?.length) {
      body.tools = this.formatTools(input.toolDeclarations);
    }

    try {
      const endpoint = `${this.baseUrl.replace(/\/$/, "")}/chat/completions`;
      const response = await this.fetchImpl(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      const data = await response.json();
      if (!response.ok) {
        const error = new Error(data?.error?.message || data?.detail || `NVIDIA HTTP ${response.status}`);
        error.code = response.status === 429 ? "NVIDIA_RATE_LIMIT" : response.status === 503 ? "NVIDIA_HTTP_503" : `NVIDIA_HTTP_${response.status}`;
        throw error;
      }
      return data;
    } catch (error) {
      if (error.name === "AbortError") {
        const timeout = new Error("NVIDIA request timed out.");
        timeout.code = "NVIDIA_TIMEOUT";
        throw timeout;
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
}

module.exports = { NvidiaProvider };
