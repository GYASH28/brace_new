# B.R.A.C.E Interface

B.R.A.C.E means Brain / Responsive / Agentic / Companion / Engine.

This is a React + Vite + Tailwind + Node backend assistant that now runs first-class on localhost in a normal browser. Electron desktop mode remains optional. The interface talks to the same modular backend through `src/lib/braceClient.ts`, using Electron IPC in desktop mode or HTTP in localhost mode.

## Setup
```powershell
npm install
```

Copy local configuration placeholders if needed:

```powershell
copy .env.example .env
```

Do not commit real API keys.

## Run Localhost Browser Mode
```powershell
npm run dev:localhost
```

Frontend:

```text
http://127.0.0.1:5173
```

Backend:

```text
http://127.0.0.1:8787
```

Health check:

```powershell
npm run health
```

## Run Frontend Only
```powershell
npm run dev -- --host 127.0.0.1 --port 5173
```

## Run Desktop
```powershell
npm run desktop
```

## Build
```powershell
npm run build
```

## Test
```powershell
npm test
```

## AI Providers
Gemini is the primary assistant brain:

```env
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
GEMINI_FALLBACK_MODEL=gemini-2.5-flash-lite
```

Legacy/local providers are optional and hidden unless `ENABLE_LEGACY_LOCAL_AI=true` or the Settings toggle is enabled.

Use the Settings page Test connection button before relying on a provider.

## Localhost Security
B.R.A.C.E binds to `127.0.0.1` by default. CORS only allows:

- `http://127.0.0.1:5173`
- `http://localhost:5173`

Direct local tool execution through `/api/tools/run` is blocked in localhost mode. Use the agent approval workflow or dry-run endpoint.

## Permissions
Open Access and enable only the capabilities you want:
- AI model access
- Local file read/write
- Folder organization
- Terminal commands
- App launching
- Browser automation
- Coding agent edits
- Memory read/write
- System info
- Git and MCP tools

## Coding Agent
Use Projects to add a project path. B.R.A.C.E can scan framework files, package scripts, and git status. Edits and command execution require approval.

## Memory
Memory is local and user-visible under the app data directory and optional Obsidian vault:

```text
C:\Users\Admin\Documents\B.R.A.C.E-MAIN\BRACE-Brain\_BRACE_DATA\memory
```

Notes are stored in:

```text
C:\Users\Admin\AppData\Roaming\B.R.A.C.E\_BRACE_DATA\notes
```

Secrets are redacted before memory and logs are written.

## Voice
B.R.A.C.E includes a rebuilt voice agent:
- Orb states: idle, listening, thinking, speaking, muted, error, offline.
- Push-to-talk and click-to-stop.
- Web Audio mic level and silence detection.
- Browser fallback STT/TTS that works without setup.
- Local provider detection for faster-whisper, Kokoro, Piper, Silero VAD, and edge-tts.
- Interruption support: speaking is cancelled when a new voice turn starts.

Optional Google TTS setup:

```env
TTS_PROVIDER=google
GOOGLE_APPLICATION_CREDENTIALS=C:\path\to\service-account.json
GOOGLE_TTS_VOICE_NAME=en-US-Chirp-HD-F
```

## Localhost Docs
- `docs/LOCALHOST_RUN_GUIDE.md`
- `docs/LOCALHOST_CONVERSION_REPORT.md`
- `docs/ARCHITECTURE_MAP_LOCALHOST.md`
- `docs/CLEANUP_REPORT.md`
- `docs/BUG_FIX_REPORT.md`
- `docs/VOICE_DIAGNOSTICS.md`
- `docs/BRACE_FEATURES_WORKFLOW_AND_BUILD.md`

## Troubleshooting
- Provider unavailable: check Settings and Test connection.
- Permission disabled: enable the named permission in Access.
- Command blocked: remove destructive, admin, persistence, credential, or download-execute behavior.
- File blocked: select the file/folder explicitly or use a configured safe folder.
- Mic issue: use Voice Settings > Test mic, check Windows microphone permission, or switch to Browser Fallback.
- Robotic voice: install Kokoro/Piper or select a better installed browser/system voice.
- Build issue: run `npm test` and `npm run build` for the exact error.
