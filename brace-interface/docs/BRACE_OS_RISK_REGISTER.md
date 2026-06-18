# BRACE OS Risk Register

## High Risks

### 1. File Path & Command Execution Vulnerability
- **Description:** Currently, the backend executes commands and file interactions with weak regex sanitization and open paths. If an LLM hallucination or malicious payload attempts a destructive command, it could be executed.
- **Mitigation:** Implement strict Path Guards (Level 3 Permissions) that only permit execution within `Desktop\Projects`, Obsidian vaults, or explicit whitelists. Set `shell: false` for child processes.

### 2. Monolithic Refactor Breakage
- **Description:** Breaking `App.tsx` (2000+ lines) into Workspaces could introduce severe regressions to existing routing and chat state.
- **Mitigation:** Extract components incrementally. Implement Playwright UI tests before and after the extraction. 

### 3. Infinite Agent Loops
- **Description:** Autonomous agents (like FORGE fixing a build) could get stuck in an infinite retry loop, burning tokens and exhausting rate limits.
- **Mitigation:** Implement hard budgets (max retry = 3), strict timeouts, and force human approval after multiple failures.

## Medium Risks

### 4. Memory Exhaustion on Localhost
- **Description:** Storing massive file diffs or entire codebases in context without a proper vector database or retrieval guard can crash the LLM context or the Node.js process (due to 100MB body limits).
- **Mitigation:** Lower request body limits. Only pass specific file snippets to the context engine. Bound the token output.

### 5. Data Loss During SQLite Migration
- **Description:** Moving from `brace-local-state.json` to a relational SQLite database could fail and corrupt user settings or tasks.
- **Mitigation:** Create automatic timestamps backups of the `.json` state. Provide a rollback script.

### 6. Voice Provider Failures
- **Description:** Kokoro TTS or cloud transcription APIs might fail, leaving the VoiceOrb in an undefined "listening" or "thinking" state.
- **Mitigation:** Implement aggressive timeout fallbacks to browser APIs. Visually inform the user of the fallback to ensure transparency.

## Low Risks

### 7. Hardware Capability Mismatch
- **Description:** Attempts to run local offline models (Ollama/LM Studio) could fail if VRAM/RAM constraints are ignored.
- **Mitigation:** Detect system hardware capabilities on startup. Provide "Recommended", "Possible but slow", and "Not practical" warnings.
