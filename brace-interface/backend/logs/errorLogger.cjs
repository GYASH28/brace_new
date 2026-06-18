const { redactSecrets } = require("../security/secretScanner.cjs");

function formatError(error) {
  const message = redactSecrets(error?.message || "Unknown error");
  return {
    message,
    code: error?.code || "ERROR",
    // Only include stack traces in development — never expose internals to users
    stack: process.env.NODE_ENV === "development" ? redactSecrets(error?.stack) : undefined,
    // Include recoverable hint for the frontend
    recoverable: error?.recoverable ?? (error?.statusCode ? error.statusCode < 500 : true),
  };
}

/**
 * Wrap async route handlers to catch unhandled errors consistently.
 */
function asyncHandler(fn) {
  return async function wrappedHandler(...args) {
    try {
      return await fn(...args);
    } catch (error) {
      throw Object.assign(
        error instanceof Error ? error : new Error(String(error)),
        { statusCode: error?.statusCode || 500 }
      );
    }
  };
}

module.exports = { formatError, asyncHandler };
