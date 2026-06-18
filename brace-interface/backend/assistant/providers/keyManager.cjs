function envKeyPool(env = process.env) {
  const keys = [];
  if (env.GEMINI_API_KEY || env.BRACE_GEMINI_API_KEY) {
    keys.push({
      provider: "gemini",
      model: env.GEMINI_MODEL || "gemini-2.5-flash",
      apiKey: env.GEMINI_API_KEY || env.BRACE_GEMINI_API_KEY,
    });
  }
  if (env.NVIDIA_API_KEY) {
    keys.push({
      provider: "nvidia",
      model: env.NVIDIA_MODEL || "meta/llama-3.1-70b-instruct",
      apiKey: env.NVIDIA_API_KEY,
    });
  }
  return keys;
}

class KeyManager {
  constructor(initialKeyPool = envKeyPool()) {
    this.pool = initialKeyPool.filter((k) => k.apiKey).map((k, index) => ({
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

module.exports = { KeyManager, envKeyPool, globalKeyManager };
