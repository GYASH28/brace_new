# B.R.A.C.E Button Audit Report

Date: 2026-06-03

## Summary

Audited button paths in `src/App.tsx`, `src/components/Interface.tsx`, `src/voice/VoiceControls.tsx`, and `src/voice/VoiceSettings.tsx`. The main reliability issues were localhost-only native picker failures, missing Electron TTS IPC, missing startup greeting controls, silent failures without toast feedback, and a broken Windows dev launcher.

## Button Audit

| Button / Control | Component | Old Behavior | Fixed Behavior | Test Status |
|---|---|---|---|---|
| Attach file / Select files | `App.tsx`, `VoiceControls.tsx`, Files page | In localhost mode, native picker was unavailable and only threw an error. | Localhost now prompts for an absolute path and still supports drag-and-drop. Electron still uses the native picker. | Playwright smoke loaded UI; manual-path fallback code verified by build. |
| Add app | `App.tsx`, Apps page | Localhost client rejected because native app picker is Electron-only. | Localhost prompts for an executable path and posts it to `/api/apps/add`; backend validates path and saves launcher entry. | Build passed; backend route patched. |
| Launch app | `App.tsx`, Apps page | Failures could bubble without visible toast. | Failures now show a toast; success still logs and shows a toast. | Build passed. |
| Remove app | `App.tsx`, Apps page | Backend failures could bubble silently. | Failures now show a toast. | Build passed. |
| Add project | `App.tsx`, Projects page | Used manual path prompt but backend errors had no toast. | Bad path or backend failure now shows a toast; success shows project-added toast. | Build passed. |
| Clear all data | `App.tsx`, Settings page | In localhost mode the client rejects for safety and could feel like a broken button. | Error now explains that clear-all is Electron-only for safety. | Build passed. |
| Clear logs | `App.tsx`, Logs page | Backend failure could be silent. | Failure shows toast; success shows logs-cleared toast. | Build passed. |
| Save memory / Search memory / Delete memory | `App.tsx`, Memory page | Errors could bubble without visible toast. | Each action is wrapped with success/error toast feedback. | Build passed. |
| Create note / Search notes / Delete note | `App.tsx`, Notes page | Errors could bubble without visible toast. | Each action is wrapped with success/error toast feedback. | Build passed. |
| Voice preview | `VoiceSettings.tsx`, `useVoiceAgent.ts` | Had duplicated Kokoro/blob playback logic separate from assistant voice. | Uses one `speakText()` path through `/api/voice/tts`. | Playwright Voice page loaded; build passed. |
| Replay voice | `VoiceSettings.tsx`, `useVoiceAgent.ts` | Had duplicated Kokoro/blob playback logic. | Uses one `speakText()` path. | Build passed. |
| Stop voice | `VoiceControls.tsx`, `VoiceSettings.tsx`, `useVoiceAgent.ts` | Stopped browser/cloud audio but playback state was spread across paths. | Stops backend audio and browser speech through shared cleanup. | Build passed. |
| Start voice / Mic | `VoiceControls.tsx`, Home, Voice page | Permission flow existed; errors surfaced through voice hook. | Kept permission flow and added unified TTS response handling after transcript. | Build passed. |
| Test startup greeting | `App.tsx` Settings page | Missing. | Added button that creates and speaks a startup greeting through Kokoro-first `speakText()`. | Playwright verified Settings control exists. |
| Local Kokoro TTS toggle | `App.tsx` Settings page | UI presented Google TTS as the main setting. | Replaced with Local Kokoro TTS. | Playwright verified control exists. |
| Kokoro voice select | `App.tsx` Settings page | Missing from main Settings. | Added Kokoro voice select wired to backend voice config. | Build passed. |
| Online fallback toggle | `App.tsx` Settings page | Online fallback existed only in Voice page. | Added main Settings toggle wired to voice config. | Build passed. |
| Google TTS fallback toggle | `App.tsx` Settings page | Google TTS was user-facing as the main TTS. | Moved to Advanced / Cloud fallback and disabled by default. | Build passed. |
| Voice settings shortcut | `VoiceControls.tsx` | Worked. | Kept. | Playwright navigated to Voice page. |
| Chat Clear / Export / Retry | `App.tsx` Chat page | Worked. | Kept. | Build passed. |
| Approve / Reject agent | `App.tsx` Agent/Chat pages | Worked through backend handlers. | Kept. | Build passed. |
| Test connection | `App.tsx` Settings page | Already caught errors with alert. | Kept. | Build passed. |
| Refresh buttons | Logs, Tools, Voice, System pages | Mostly worked; Logs clear now has toast. | Kept refresh flows; voice refresh still reloads config/status. | Build passed. |
| `npm run dev:localhost` launcher | `scripts/dev-localhost.cjs` | Windows hidden launch failed with `spawn EINVAL` for `npx.cmd`. | Uses piped stdio and launches Vite via local `node_modules/vite/bin/vite.js`. | Dev stack and Playwright smoke passed. |

## Remaining Button Limitations

- Native file/app pickers are only available in Electron. Localhost mode now gives manual path fallbacks where practical.
- Launching apps still depends on Windows path validity and app launch permission.
- Clear-all remains Electron-only for safety in localhost browser mode.
- Voice preview can only produce Kokoro audio when Kokoro Python dependencies are installed.

## Verification

- `npm test`: passed, 17/17 tests.
- `npm run build`: passed.
- `npm run health`: passed after backend start.
- `npm run dev:localhost`: stack started after script fix.
- Playwright UI smoke: Home, Voice, and Settings loaded; Kokoro/startup controls visible; console error count 0.
