# B.R.A.C.E Localhost Run Guide

Date: 2026-06-03

## Quick Start

```powershell
cd "C:\Users\Admin\Documents\B.R.A.C.E-MAIN\brace-interface"
npm install
copy .env.example .env
npm run dev:localhost
```

Open:

```text
http://127.0.0.1:5173
```

The backend runs on:

```text
http://127.0.0.1:8787
```

No EXE or Electron packaging step is required for localhost mode.

## Useful Commands

```powershell
npm run backend:localhost
npm run frontend:localhost
npm run start:localhost
npm run health
npm test
npm run build
npm run dev -- --host 127.0.0.1 --port 5173
```

`npm run dev:localhost` starts both the backend and Vite frontend. Vite uses `--strictPort`, so port conflicts fail clearly instead of moving the UI to a different port.

## Localhost Environment

```env
BRACE_HOST=127.0.0.1
BRACE_BACKEND_PORT=8787
BRACE_ALLOWED_ORIGINS=http://127.0.0.1:5173,http://localhost:5173
BRACE_HTTP_BODY_LIMIT_BYTES=26214400
BRACE_HTTP_TIMEOUT_MS=90000
VITE_BRACE_API_BASE_URL=http://127.0.0.1:8787
```

## Gemini

```env
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
GEMINI_FALLBACK_MODEL=gemini-2.5-flash-lite
```

B.R.A.C.E starts without Ollama or any local model server. Missing Gemini keys return friendly setup errors instead of crashing the UI.

## Google TTS

```env
TTS_PROVIDER=google
GOOGLE_APPLICATION_CREDENTIALS=C:\path\to\service-account.json
GOOGLE_TTS_VOICE_NAME=en-US-Chirp-HD-F
```

If Google TTS is unavailable, voice replies fall back to browser/system speech when voice output is enabled.

## Memory

```env
OBSIDIAN_VAULT_PATH=C:\Users\Admin\Documents\B.R.A.C.E-MAIN\BRACE-Brain
BRACE_BRAIN_PATH=C:\Users\Admin\Documents\B.R.A.C.E-MAIN\BRACE-Brain
FIREBASE_ENABLED=false
```

Local JSON memory works without Gemini. `Remember that ...` saves locally first; Obsidian and Firebase are optional adapters.

## Health Checks

```powershell
npm run health
```

Checks:

- `/health`
- `/api/status`
- `/api/assistant/status`
- `/api/voice/status`
- `/api/memory/status`
- `/api/memory`

## Browser Mode Notes

The browser UI uses `src/lib/braceClient.ts`, which selects Electron IPC when the preload bridge exists and HTTP when running in localhost mode.

Native Electron-only features are intentionally limited in browser mode:

- Native file picker is unavailable; use drag-and-drop or paste absolute paths where supported.
- Native app picker is unavailable; existing launcher entries can still be launched through permission-gated backend routes.
- `clearAllData` remains Electron-only for safety.
- Direct `/api/tools/run` is blocked; use the agent approval workflow or dry-run endpoint.

## Verified

On 2026-06-03:

- `npm test` passed: 17 tests.
- `npm run build` passed.
- `npm run health` passed.
- Playwright loaded desktop and mobile localhost UI.
- Chat, Voice, Tools, and Settings routes rendered expected headings.
- No console errors appeared during the smoke test.
