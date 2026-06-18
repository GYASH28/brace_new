# B.R.A.C.E Localhost Conversion Report

Date: 2026-06-03

## Summary

B.R.A.C.E now has a first-class localhost browser runtime. The React UI can run at `http://127.0.0.1:5173` and talk to a local HTTP backend at `http://127.0.0.1:8787` without requiring an EXE or Electron packaging.

Electron desktop mode remains optional.

## Major Changes

- Added `backend/server.cjs` as a localhost HTTP backend entry point.
- Added `scripts/dev-localhost.cjs` to run backend and Vite together.
- Added `scripts/check-health.cjs` for endpoint checks.
- Added package scripts for localhost mode.
- Added `src/lib/braceClient.ts` as the unified Electron-or-HTTP adapter.
- Routed the React app and voice hooks through `braceClient`.
- Added visible runtime status: `Electron Mode` or `Localhost Browser Mode`.
- Added strict localhost CORS with structured 403 errors for non-local origins.
- Added `/api/memory/status`.
- Added graceful backend shutdown and crash/rejection logging.
- Added body size limits and request timeouts.
- Kept dangerous direct tool execution blocked in localhost mode.

## Localhost API

Implemented routes include:

- `GET /health`
- `GET /api/status`
- `GET /api/state`
- `GET /api/settings`
- `POST /api/settings`
- `POST /api/settings/secret`
- `POST /api/permissions`
- `GET /api/logs`
- `DELETE /api/logs`
- `GET /api/chat`
- `POST /api/chat`
- `DELETE /api/chat`
- `POST /api/assistant/chat`
- `GET /api/assistant/status`
- `GET /api/voice/status`
- `GET /api/voice/config`
- `POST /api/voice/config`
- `POST /api/voice/transcribe`
- `POST /api/voice/tts`
- `GET /api/memory`
- `GET /api/memory/status`
- `POST /api/memory`
- `GET /api/notes`
- `POST /api/notes`
- `GET /api/tools`
- `POST /api/tools/dry-run`
- `POST /api/tools/run`
- `GET /api/projects`
- `POST /api/projects/scan`

`POST /api/tools/run` returns 403 by design. Direct local tool execution remains behind the agent approval flow.

## Security

- Backend binds to `127.0.0.1` by default.
- Allowed browser origins are restricted to `http://127.0.0.1:5173` and `http://localhost:5173` unless explicitly configured.
- Disallowed origins receive:

```json
{
  "ok": false,
  "error": {
    "code": "CORS_ORIGIN_BLOCKED",
    "message": "Only localhost frontend origins are allowed.",
    "recoverable": false
  }
}
```

- Renderer still has no direct Node access.
- Secrets stay in backend settings/state and are not exposed in the frontend bundle.
- Permissions, path guard, command risk analyzer, secret redaction, safe mode, and approval workflow remain active.

## UI And Performance

- Chat messages are capped to the newest 250 rendered items.
- Chat history persistence is debounced.
- Logs render only the newest 300 entries to reduce page lag.
- Long chat text now wraps safely.
- Chat auto-scrolls to new messages.
- System polling is slower and page-aware.
- Mobile bottom navigation now exposes all app pages.
- Reduced-motion users get much less animation pressure.
- Disabled controls have stable visual behavior.
- Runtime badge shows whether the app is in browser or Electron mode.

## Voice

- Voice starts only after microphone permission is enabled.
- Voice output setting now prevents both backend TTS requests and browser fallback speech.
- Stop/interruption now stops cloud audio and browser speech.
- Cloud audio respects configured volume.
- Cloud playback pause/stop resolves cleanly instead of hanging the voice turn.
- Voice cleanup stops browser speech on unmount.
- Google TTS remains optional; browser speech remains the fallback.

## Gemini And Memory

- Gemini remains the primary assistant brain.
- Default model is `gemini-2.5-flash`.
- Fallback model is `gemini-2.5-flash-lite`.
- Legacy/local provider controls stay hidden unless compatibility mode is enabled.
- Memory context is built before Gemini calls.
- `Remember that ...` saves memory without requiring Gemini.
- Obsidian path defaults are aligned to `C:\Users\Admin\Documents\B.R.A.C.E-MAIN\BRACE-Brain`.
- Firebase remains optional.

## Verification

Commands run:

```powershell
npm test
npm run build
npm run health
```

Results:

- `npm test`: passed, 17 tests.
- `npm run build`: passed.
- `npm run health`: passed all checks.
- CORS remote-origin probe: returned structured 403.
- Playwright desktop smoke: Home, Chat, Voice, Tools, Settings loaded.
- Playwright mobile smoke: mobile bottom nav rendered 15 page buttons.
- Console errors during smoke: none.

## Remaining Limitations

- Browser mode cannot use native Electron file/app pickers.
- Standalone `/api/voice/tts` reports 501; assistant voice responses still use Google TTS or browser fallback.
- WebSocket/SSE streaming was not added because the current architecture works safely without it.
- Some local TTS providers are status-detected but not fully wired as standalone synthesis engines.
