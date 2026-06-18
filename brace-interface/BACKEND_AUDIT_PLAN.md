# Backend Stability & Security Audit Plan

## 1. Timeouts
**Current State:** `server.cjs` sets a request timeout using `setTimeout()`, responding with a 503 if time runs out. However, the `route(req, res)` execution does not abort.
**Implementation:**
- Implement `AbortController` in the request handling flow.
- Pass `AbortSignal` to asynchronous and I/O-heavy handlers to stop their execution immediately upon timeout.
- Ensure all `res.write` or `res.end` calls inside async handlers check `res.writableEnded` to prevent `ERR_HTTP_HEADERS_SENT` crashes.

## 2. Request Limits
**Current State:** The default body limit is up to 100MB (`BODY_LIMIT_BYTES`), making the API vulnerable to memory exhaustion from massive JSON payloads. The rate limiter is a basic fixed-window bucket that clears every 60 seconds, which is less precise than a sliding window.
**Implementation:**
- Reduce default `BODY_LIMIT_BYTES` to a reasonable API standard (e.g., 2MB).
- Upgrade the rate limiter to a sliding log or sliding window approach to prevent burst request spikes exactly at the window boundary.
- Support `X-Forwarded-For` IP checking safely if the backend expects to sit behind proxies.

## 3. Error Boundaries
**Current State:** `uncaughtException` in `server.cjs` only forces a graceful shutdown for specific codes (`ERR_OUT_OF_RANGE`, `ERR_WORKER_OUT_OF_MEMORY`). Other uncaught errors are merely logged, leaving Node.js in a potentially undefined/corrupted state.
**Implementation:**
- Change `uncaughtException` and `unhandledRejection` handlers to gracefully shut down the application after logging the error, as recommended by Node.js best practices.
- Add an application-level request domain or `AsyncLocalStorage` to ensure any floating promise within a route execution can be tied to the request ID and captured cleanly.

## 4. Structured Logs
**Current State:** `server.cjs` mixes `backend.logger.log` (structured) with raw `console.log()` and `console.error()` (unstructured).
**Implementation:**
- Remove all `console.*` statements in `server.cjs` (e.g., for `EADDRINUSE` and startup).
- Ensure the `activityLogger` formats errors properly (including stack traces) instead of just stringifying their messages.

## 5. System Tool Safety
**Current State:** 
- `commandTools.cjs` uses `spawn` with `shell: true`, which relies heavily on `analyzeCommandRisk()` to block shell injections. If the analyzer misses anything, command injection is trivial.
- `server.cjs` uses a regex `/[|&;\`$(){}]/` to sanitize inputs to `cmd.exe /c start`, which misses some operators (`<`, `>`, `%VAR%`).
- `appTools.cjs` allows launching *any* executable on the system as long as `fs.existsSync` passes.
**Implementation:**
- Set `shell: false` in `runCommand` (`commandTools.cjs`) and parse commands into strictly escaped arguments arrays.
- Replace regex-based sanitization in `server.cjs` with safe, shell-less execution or stricter whitelisting.
- Implement path-based execution boundaries in `appTools.cjs` (e.g., restrict executions to safe directories, explicitly blocking `C:\Windows\System32` or arbitrary temp folders).
