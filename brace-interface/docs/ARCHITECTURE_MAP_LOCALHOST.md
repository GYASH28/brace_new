# B.R.A.C.E Localhost Architecture Map

Date: 2026-06-03

## Scope

Active app:

```text
C:\Users\Admin\Documents\B.R.A.C.E-MAIN\brace-interface
```

Brain/vault data:

```text
C:\Users\Admin\Documents\B.R.A.C.E-MAIN\BRACE-Brain
```

Treat `BRACE-Brain` as user knowledge/data. The older `_external_clone_BRACE` folder is historical reference, not the active app.

## Runtime Entry Points

Frontend:

- `index.html`
- `src/main.tsx`
- `src/App.tsx`

Electron:

- `electron/main.cjs`
- `electron/preload.cjs`

Localhost:

- `backend/server.cjs`
- `scripts/dev-localhost.cjs`
- `src/lib/braceClient.ts`

## Package Scripts

- `npm run dev`: Vite only.
- `npm run dev:localhost`: backend plus frontend.
- `npm run backend:localhost`: HTTP backend at `127.0.0.1:8787`.
- `npm run frontend:localhost`: Vite at `127.0.0.1:5173`.
- `npm run start:localhost`: backend only.
- `npm run health`: endpoint health checks.
- `npm test`: backend Node tests.
- `npm run build`: TypeScript and Vite build.
- `npm run desktop`: optional Electron desktop mode.

## Frontend Modules

- `src/App.tsx`: main app shell, page routing, state, permissions, chat, files, tasks, apps, logs, settings.
- `src/components/Interface.tsx`: shared UI components.
- `src/data/appData.ts`: navigation and static UI data.
- `src/lib/braceClient.ts`: runtime adapter for Electron IPC or HTTP.
- `src/voice/*`: voice recorder, player, orb, controls, settings, and voice workflow.
- `src/types.ts`: shared frontend types.

## Backend Modules

- `backend/index.cjs`: creates state, logger, memory, notes, voice, tools, agent runtime, assistant orchestrator, and handlers.
- `backend/server.cjs`: HTTP adapter for localhost browser mode.
- `backend/config`: environment and state defaults.
- `backend/assistant`: Gemini orchestrator, context builder, memory adapters, assistant tool declarations, Google TTS.
- `backend/agent`: intent classifier, planner, approval flow, executor.
- `backend/tools`: local tools for files, folders, commands, apps, system, coding, browser status, MCP status.
- `backend/security`: permissions, path guard, command risk analyzer, secret redaction.
- `backend/memory`: local JSON memory.
- `backend/notes`: local notes.
- `backend/projects`: project scanner.
- `backend/voice`: voice config, status, transcription.

## Electron Bridge

`electron/preload.cjs` exposes `window.braceDesktop` through `contextBridge`.

The renderer uses `braceClient`, which selects:

- Electron bridge when `window.braceDesktop` exists.
- HTTP backend when running in normal browser localhost mode.

Electron-only features:

- Native file picker.
- Native folder picker.
- Native app executable picker.
- Global hotkeys.
- Renderer event push.
- Electron shell behavior.
- Clear all local data.

## Localhost HTTP Backend

`backend/server.cjs` creates the same backend used by Electron, then exposes JSON routes under `/api/*`.

Defaults:

```text
Host: 127.0.0.1
Port: 8787
Frontend: http://127.0.0.1:5173
```

Responses use:

```json
{ "ok": true, "data": {} }
```

or:

```json
{ "ok": false, "error": { "code": "CODE", "message": "Message", "recoverable": true } }
```

## State And Data

Electron state path:

```text
app.getPath("userData")\brace-local-state.json
```

Localhost default state path:

```text
C:\Users\Admin\AppData\Roaming\B.R.A.C.E\brace-local-state.json
```

Override:

```env
BRACE_USER_DATA_DIR=
```

Runtime data lives under:

```text
userData\_BRACE_DATA
```

Local JSON memory:

```text
userData\_BRACE_DATA\memory\memoryStore.json
```

Local notes:

```text
userData\_BRACE_DATA\notes
```

Obsidian memory:

```text
C:\Users\Admin\Documents\B.R.A.C.E-MAIN\BRACE-Brain\_BRACE_DATA\memory\assistant
```

## Assistant Flow

1. UI calls `braceClient.assistantChat`.
2. Electron IPC or HTTP forwards to backend handler.
3. Assistant detects mode: memory, coding, agent, voice, project, or normal.
4. Memory context is gathered from local JSON, Obsidian, and optional Firebase.
5. Gemini receives prompt, system instructions, memory, conversation, and safe tool declarations.
6. Low-risk assistant tools may run; medium/high risk returns approval requirements.
7. Optional Google TTS audio is generated for voice responses.
8. Response returns with text, model, memory summaries, tool summaries, and optional audio.
9. UI updates chat, logs, agent state, and voice state.

## Voice Flow

1. UI verifies microphone permission.
2. `useAudioRecorder` starts browser speech recognition when available.
3. MediaRecorder plus backend transcription is used as fallback when configured.
4. Final transcript goes to `useVoiceAgent`.
5. Assistant response returns text and optional audio.
6. Google TTS audio plays when configured and returned.
7. Browser speech synthesis is used only when cloud audio is missing or fails and voice output is enabled.
8. Stop/interruption cancels both cloud audio and browser speech.

## Safety Model

B.R.A.C.E keeps:

- Explicit permissions.
- Safe folders.
- Path guard.
- Command risk analyzer.
- Secret scanner.
- Tool risk levels.
- Approval workflow.
- Safe mode.
- Audit logs.
- Localhost-only binding by default.
- Strict localhost CORS.

## Known Optional/Deferred Areas

- Native pickers remain Electron-only.
- Standalone HTTP TTS endpoint is intentionally not exposed yet.
- SSE/WebSocket streaming was not added.
- Local Kokoro/Piper synthesis is detected but not fully exposed as standalone TTS.
