const initialKeyPool = [
  { provider: "gemini", model: "gemini-2.5-flash", apiKey: "AQ.Ab8RN6LL-Gr-hMzp3GMwBVBQE-BseeRttQHNVslXoAtwG25r3Q" },
  { provider: "nvidia", model: "nvidia/llama-3.1-nemotron-70b-instruct", apiKey: "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" },
  { provider: "nvidia", model: "meta/llama-3.3-70b-instruct", apiKey: "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" },
  { provider: "nvidia", model: "deepseek-ai/deepseek-r1", apiKey: "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" },
  { provider: "nvidia", model: "Qwen/Qwen2.5-72B-Instruct", apiKey: "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" },
  { provider: "nvidia", model: "minimax/minimax-v1", apiKey: "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" },
  { provider: "nvidia", model: "nvidia/llama-3.1-nemotron-70b-instruct", apiKey: "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" },
];

class KeyManager {
  constructor() {
    this.pool = initialKeyPool.map((k, index) => ({
      ...k,
      id: `${k.provider}-${k.model}-${index}`,
      rateLimitedUntil: 0,
      totalRequests: 0,
      failures: 0,
    }));
  }

  // Gets the best available key for a preferred provider/model, 
  // falling back to other providers if all preferred keys are rate limited.
  getAvailableKey(preferredProvider = "gemini") {
    const now = Date.now();
    
    // Sort pool: 1. Not rate limited, 2. Preferred provider, 3. Fewest requests
    const sortedPool = [...this.pool].sort((a, b) => {
      const aAvail = a.rateLimitedUntil <= now;
      const bAvail = b.rateLimitedUntil <= now;
      if (aAvail !== bAvail) return aAvail ? -1 : 1; // Available first
      
      const aPref = a.provider === preferredProvider;
      const bPref = b.provider === preferredProvider;
      if (aPref !== bPref) return aPref ? -1 : 1; // Preferred provider next
      
      return a.totalRequests - b.totalRequests; // Least used next
    });

    const bestKey = sortedPool[0];
    
    // If even the best key is rate-limited, we just wait/retry it anyway (or return it and fail)
    if (bestKey && bestKey.rateLimitedUntil > now) {
      console.warn(`[KeyManager] All keys are rate limited. Using ${bestKey.provider} anyway.`);
    }

    return bestKey;
  }

  markRateLimited(id, cooldownMs = 60000) {
    const key = this.pool.find(k => k.id === id);
    if (key) {
      key.rateLimitedUntil = Date.now() + cooldownMs;
      key.failures += 1;
      console.warn(`[KeyManager] Key ${key.id} rate limited. Cooldown for ${cooldownMs}ms`);
    }
  }

  recordSuccess(id) {
    const key = this.pool.find(k => k.id === id);
    if (key) {
      key.totalRequests += 1;
    }
  }
}

const globalKeyManager = new KeyManager();

module.exports = { KeyManager, globalKeyManager };
