const { GeminiProvider } = require("./geminiProvider.cjs");
const { NvidiaProvider } = require("./nvidiaProvider.cjs");
const { globalKeyManager } = require("./keyManager.cjs");

function createModelRouter(config) {
  function createProviderInstance(keyInfo) {
    if (keyInfo.provider === "nvidia") {
      return new NvidiaProvider({
        apiKey: keyInfo.apiKey,
        baseUrl: "https://integrate.api.nvidia.com/v1",
        model: keyInfo.model,
        fallbackModel: config.fallbackModel,
        timeoutMs: config.requestTimeoutMs,
        maxRetries: 1, // Disable inner retries for faster fallbacks
        temperature: config.temperature,
        maxTokens: config.maxTokens,
      });
    }
    
    return new GeminiProvider({
      apiKey: keyInfo.apiKey,
      model: keyInfo.model,
      fallbackModel: config.fallbackModel,
      timeoutMs: config.requestTimeoutMs,
      maxRetries: 1,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
    });
  }

  return {
    generate: async (params, overrideProvider) => {
      let attempts = 0;
      let lastError = null;
      
      // Try up to 3 times with different keys
      while (attempts < 3) {
        const keyInfo = globalKeyManager.getAvailableKey(overrideProvider || config.provider);
        if (!keyInfo) {
          throw new Error("No API keys available in the KeyManager pool.");
        }
        
        console.log(`[ModelRouter] Attempt ${attempts + 1}: Routing to ${keyInfo.provider} (${keyInfo.model}) via KeyManager`);
        const provider = createProviderInstance(keyInfo);
        
        try {
          const result = await provider.generate(params);
          globalKeyManager.recordSuccess(keyInfo.id);
          return result;
        } catch (error) {
          lastError = error;
          const isRateLimit = ["GEMINI_RATE_LIMIT", "NVIDIA_RATE_LIMIT"].includes(error.code) || error.message.includes("429");
          const isTimeout = ["GEMINI_TIMEOUT", "NVIDIA_TIMEOUT", "GEMINI_HTTP_503", "NVIDIA_HTTP_503"].includes(error.code);
          
          if (isRateLimit || isTimeout) {
            console.warn(`[ModelRouter] ${keyInfo.id} exhausted (${error.code || "timeout"}). Falling back...`);
            globalKeyManager.markRateLimited(keyInfo.id, 60000 * 2); // 2 minute cooldown
            attempts++;
          } else {
            // Unrecoverable error (e.g. bad request formatting)
            throw error;
          }
        }
      }
      
      throw new Error(`ModelRouter exhausted all fallback attempts. Last error: ${lastError?.message}`);
    }
  };
}

module.exports = { createModelRouter };
