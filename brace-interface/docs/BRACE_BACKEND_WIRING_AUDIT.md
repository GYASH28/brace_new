# BRACE Backend Wiring Audit

## What the app actually is
B.R.A.C.E is a local/desktop AI assistant app built with a React frontend (Vite) and a Node.js CommonJS backend. It was originally an Electron-first desktop app but has been converted into a localhost web runtime. 

## Frameworks
- **Frontend**: React + TypeScript + Tailwind CSS (bundled via Vite on port 5173).
- **Backend**: Node.js + Express + CommonJS (running on port 8787).
- **Desktop Layer**: Electron (optional, heavily decoupled).

## Startup Sequence
1. The backend initializes first via `npm run backend:localhost` (or `node scripts/dev-localhost.cjs`), mapping memory providers, voice pipelines, and the orchestration logic.
2. Vite serves the frontend on port 5173.
3. The frontend `braceClient` initializes and performs a handshake via `GET /health` to determine the runtime mode (Browser/Electron).
4. The backend loads its configuration from `defaultConfig.cjs` and connects the active `aiProvider`.

## File & Module Status
- `orchestrator.cjs`: Active and stable. Manages provider logic and tool execution.
- `types.ts`: Active. Synchronizes frontend UI states with backend data models.
- `agentRoster.cjs`: Active. Houses the 12-employee B.R.A.C.E swarm.
- `geminiProvider.cjs` / `nvidiaProvider.cjs`: Active AI gateways.
- `googleTtsProvider.cjs`: Active.
- Unused/Old systems (Electron preload hooks, hardcoded Ollama dependencies) have been stripped or disabled as documented in `CLEANUP_REPORT.md`.

## Active AI Providers
1. **Gemini** (Primary fallback framework if keys are set).
2. **NVIDIA NIM** (Current active primary, powered by `meta/llama-3.1-70b-instruct`).
3. **OpenAI** / **Custom** (Supported through routing).

## Voice Providers
- **Google Cloud TTS**: Primary text-to-speech if keys are loaded.
- **Kokoro / Browser Speech Fallback**: Automatically triggers when cloud TTS is unavailable.
- **Microphone / VAD**: Handled via browser-native web APIs or backend Whisper depending on settings.

## Memory Systems
- **Obsidian Memory Adapter**: Active. Reads/writes markdown inside `BRACE-Brain`.
- **Firebase Sync**: Optional. Can sync logs to a cloud database.
- **Local JSON**: Used for configuration (`_BRACE_DATA`).

## Dead/Unused Systems Removed
- The hard-coupled Electron IPC pipeline for chat execution has been entirely replaced by HTTP `/api/assistant/chat` routes.
- Extraneous local model servers and Ollama routing are decoupled and deprecated to prevent startup crashes.
