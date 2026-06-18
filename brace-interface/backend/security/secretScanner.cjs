const SECRET_PATTERNS = [
  // Google / Firebase API keys
  { pattern: /A[I]za[0-9A-Za-z_-]{20,}/g, replacement: "A-I-z-a...redacted" },
  // OpenAI keys
  { pattern: /sk-[0-9A-Za-z_-]{12,}/g, replacement: "sk-...redacted" },
  // GitHub tokens (classic + fine-grained)
  { pattern: /ghp_[0-9A-Za-z_]{20,}/g, replacement: "ghp_...redacted" },
  { pattern: /github_pat_[0-9A-Za-z_]{20,}/g, replacement: "github_pat_...redacted" },
  // Slack tokens
  { pattern: /xox[baprs]-[0-9A-Za-z-]{20,}/g, replacement: "xox-...redacted" },
  // AWS keys
  { pattern: /AKIA[0-9A-Z]{16}/g, replacement: "AKIA...redacted" },
  // Discord bot tokens (base64-ish)
  { pattern: /[MN][A-Za-z0-9]{23,28}\.[A-Za-z0-9_-]{6}\.[A-Za-z0-9_-]{27,}/g, replacement: "discord_token...redacted" },
  // Stripe keys
  { pattern: /sk_live_[0-9A-Za-z]{20,}/g, replacement: "sk_live_...redacted" },
  { pattern: /pk_live_[0-9A-Za-z]{20,}/g, replacement: "pk_live_...redacted" },
  // npm tokens
  { pattern: /npm_[0-9A-Za-z]{36}/g, replacement: "npm_...redacted" },
  // JWT tokens
  { pattern: /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, replacement: "jwt_...redacted" },
  // SSH private key content
  { pattern: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE K[E]Y[\s\S]*?-----END (?:RSA |EC |OPENSSH |DSA )?PRIVATE K[E]Y-----/g, replacement: "...private_key_redacted..." },
  // Generic key=value patterns (last — broadest)
  { pattern: /(api[_-]?key|token|secret|password|authorization)\s*[:=]\s*["']?[^"'\s]{8,}/gi, replacement: "$1=...redacted" },
];

function redactSecrets(value) {
  if (value == null) return value;
  if (typeof value === "string") {
    return SECRET_PATTERNS.reduce((text, item) => text.replace(item.pattern, item.replacement), value);
  }
  if (Array.isArray(value)) return value.map(redactSecrets);
  if (typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, redactSecrets(child)]));
  }
  return value;
}

module.exports = { redactSecrets, SECRET_PATTERNS };
