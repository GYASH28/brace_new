# B.R.A.C.E Bug Fix Report

Date: 2026-06-03

## Fixed

| Area | Bug | Status |
| --- | --- | --- |
| Localhost runtime | Browser mode required Electron preload APIs in the main app. | Fixed with `src/lib/braceClient.ts` and renderer migration. |
| Localhost API | `/api/memory/status` was missing. | Fixed. |
| CORS | Disallowed origins were not explicitly rejected. | Fixed with structured 403 responses. |
| Vite port | Frontend could silently move away from port 5173. | Fixed with `--strictPort`. |
| Settings | Test connection still called `window.braceDesktop`. | Fixed to use `braceClient.testAi()`. |
| Voice | Voice output off still allowed backend voice/TTS requests. | Fixed by sending `voice: false` when TTS is off. |
| Voice | Browser fallback speech could still speak when voice output was disabled. | Fixed. |
| Voice | Stop/interruption only stopped browser speech, not cloud audio. | Fixed with unified `stopAllAudio`. |
| Voice | Cloud TTS playback ignored configured volume. | Fixed. |
| Voice | Stopping cloud audio could leave the voice command promise unresolved. | Fixed with pause/finish handling. |
| Voice | Voice cleanup did not stop browser speech on unmount. | Fixed. |
| Voice | Mic start did not enforce permission from the UI flow. | Fixed by enabling/checking microphone permission before starting. |
| UI performance | Long chat sessions rendered too many messages. | Fixed with 250-message render cap. |
| UI performance | Log page rendered the full log history. | Fixed with newest-300 render cap. |
| UI rendering | Chat could fail to autoscroll to new messages. | Fixed. |
| UI rendering | Long assistant/user text could overflow. | Fixed with stronger wrapping. |
| UI mobile | Small screens lacked a full navigation surface. | Fixed with bottom mobile nav. |
| UI accessibility | Reduced-motion support was too narrow. | Improved. |
| Cleanup | `.gitignore` hid any folder named `logs`, including source folders. | Fixed. |
| Paths | Renderer and preload brain path hints referenced old `Documents\BRACE-Brain`. | Fixed to `B.R.A.C.E-MAIN\BRACE-Brain`. |

## Partially Fixed

| Area | Issue | Status |
| --- | --- | --- |
| Browser native pickers | Browser mode cannot show Electron-native file/app dialogs. | Intentionally limited; drag/drop and backend routes remain available. |
| Standalone TTS endpoint | `/api/voice/tts` exists but returns 501. | Deferred; assistant voice responses still support Google TTS/browser fallback. |
| Local TTS providers | Kokoro/Piper are status-detected but not wired as full standalone synthesis engines. | Deferred. |
| SSE/WebSocket updates | Agent events in browser mode do not stream from backend. | Deferred because current localhost UI works without streaming. |

## Intentionally Deferred

- Full frontend component test suite.
- Dedicated voice dependency installer.
- Streaming Gemini responses.
- Full browser-mode native file picker equivalent.
- Local Kokoro/Piper synthesis endpoint.

## Verification

- `npm test`: passed, 17 tests.
- `npm run build`: passed.
- `npm run health`: passed.
- Playwright localhost smoke: passed for Home, Chat, Voice, Tools, Settings, desktop and mobile.
- Console errors during smoke: none.
