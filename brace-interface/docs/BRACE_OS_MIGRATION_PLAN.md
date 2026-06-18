# BRACE OS Migration Plan

## 1. Migration Strategy Overview
The transformation from the current monolithic BRACE interface to the AI-Native Operating Environment will be performed incrementally, in parallel to existing operations where possible, inside the canonical `new brace/brace-interface` repository.

## 2. Phase-by-Phase Rollout

### Phase 1: Localhost Shell & Backend Foundation
- Upgrade `backend/server.cjs` and `src/lib/braceClient.ts` to support Server-Sent Events (SSE).
- Harden the backend server (timeouts, constraints, logging).
- **Migration Impact:** Seamless. The frontend will shift to the unified client without user disruption.

### Phase 2: Dismantling the Frontend Monolith (Core OS Capabilities)
- Split `src/App.tsx` into modular Workspace components (`GeneralWorkspace`, `CodingWorkspace`, etc.).
- Move manual page routing into a robust workspace state manager.
- Implement the universal search and context bar.
- **Migration Impact:** High. The entire UI paradigm will change from "sidebar pages" to "contextual workspaces".

### Phase 3 & 4: AI Model Layer & Agents
- Transition backend API calls from direct Gemini calls to a `ModelRouter` interface.
- Implement specialized agent definitions.
- Introduce the Agent Status Panel in the UI.
- **Migration Impact:** Moderate. Legacy assistant capabilities will be mapped to the `BRACE` CEO agent or `FRIDAY` coordinator.

### Phase 5: Memory System (SQLite & Obsidian)
- Initialize SQLite databases alongside the existing file-based states.
- Migrate any `brace-local-state.json` data into the new SQLite database schema.
- **Migration Impact:** Moderate. Requires a one-time script to ingest existing settings, API keys, and memory entries into SQLite.

### Phase 6: Voice System
- Refactor the current Web Speech + Kokoro implementation to support interruption and pure streaming state management.
- Update the `VoiceOrb` UI to accurately reflect the real-time STT/TTS pipeline state.

### Phase 7 & 8: Business OS & Integrations
- Introduce pipeline stages for Clients, Leads, and Websites.
- Scaffold integrations with Git, VS Code, Browser, and automation platforms (n8n).

### Phase 9: Testing & Security Verification
- Ensure full playbook execution against the defined Risk Register.
- Conduct local stress tests.

## 3. Data Migration Steps
When deploying Phase 5 (Memory):
1. **Backup:** Create an automated backup of `brace-local-state.json`.
2. **Schema Generation:** Run SQLite migrations to build `settings`, `tasks`, `memory_index`, `conversations`, etc.
3. **Data Ingestion:** A backend script will map and insert JSON values into their respective relational tables.
4. **Validation:** The startup script will verify database integrity before starting the frontend server.
