# B.R.A.C.E Kokoro Voice, Buttons, And Startup Greeting Fix Report

Date: 2026-06-03

## Summary

Implemented a Kokoro-first voice path for localhost and Electron modes, added startup greeting generation, fixed the one-word/browser speech truncation risk, added the missing Electron TTS bridge, replaced user-facing Google TTS controls with Kokoro-first controls, and fixed several button paths that failed silently in localhost mode.

## Why Voice Was Falling Back To Google Or Browser

- `backend/assistant/orchestrator.cjs` created a Google TTS adapter and automatically synthesized assistant voice responses when `payload.voice` was true.
- `backend/assistant/config/assistantConfig.cjs` defaulted Google TTS to enabled when `ttsEnabled` was true and defaulted `TTS_PROVIDER` to `google`.
- Electron did not expose `voice:tts`, so `src/lib/braceClient.ts` rejected `synthesizeVoice()` in desktop mode.
- `/api/voice/tts` existed in localhost, but frontend voice playback still had multiple fallback paths and could use assistant-returned cloud audio.
- Browser fallback was used when Kokoro dependency checks failed, and those failures were not always visible to the UI.

## Why Kokoro Was Not Always Used

- Kokoro status was tied to a combined "best local" requirement: faster-whisper, Kokoro, and Silero VAD all had to be present before Kokoro could appear active.
- `backend/voice/kokoroProvider.cjs` only launched with `python`, so Windows machines where Kokoro was installed under `py -3` could fail.
- Kokoro failure logs did not include enough setup, text length, voice, or audio size detail.
- The assistant chat flow could bypass `voiceService.synthesize()` entirely.

## Why Voice Could Speak Only One Word

- `src/voice/useAudioPlayer.ts` removed everything after `Route:` using `text.replace(/Route:.*$/s, "")`. If an assistant response contained `Route:` early, browser fallback speech could be shortened severely.
- `src/voice/useVoiceAgent.ts` duplicated audio playback for Kokoro, cloud audio, preview, and replay, making it easier for one path to speak a different text than the full assistant response.
- There was no truncation guard warning when sanitized speech became one word while the response contained many words.

## What Was Fixed

- Removed automatic Google synthesis from assistant chat responses. Assistant chat now returns text; frontend calls `synthesizeVoice()` with the full response.
- `voiceService.synthesize()` now owns assistant voice, preview, replay, and startup greeting synthesis.
- TTS priority is now:
  1. Kokoro local TTS
  2. Edge TTS only when online fallback is enabled
  3. Google TTS only when `googleTtsFallbackEnabled` is true
  4. Browser speech only when explicitly allowed after a logged backend TTS failure
- `/api/voice/tts` returns the stable TTS object directly:
  `{ ok, provider, audioBase64?, mimeType?, browserFallback?, text?, error?, setup? }`
- Electron now exposes `voice:tts` and preload `synthesizeVoice()`.
- Frontend now has `voiceAgent.speakText(text, reason)` and uses it for assistant response, preview, replay, and startup greeting.
- Browser speech sanitizer now removes code blocks and tool tags but does not delete text after `Route:`.
- Added a truncation guard warning and voice log event.
- Kokoro provider now tries `python`, then `py -3`, and logs provider, input length, sanitized length, preview, voice id, audio bytes, duration, and setup errors.
- Voice status selection now lets Kokoro TTS show active independently of STT/VAD availability.
- Startup greeting endpoints added:
  - `GET /api/greeting/startup`
  - `POST /api/greeting/startup`
- Startup greetings use recent chat, local memory, active projects, current time, random styles, and recent greeting hashes to avoid exact repeats.
- Greetings redact secrets and replace raw private paths with safe wording.
- Settings now show Local Kokoro TTS, Kokoro voice, Online fallback, Startup voice greeting, Test startup greeting, and Advanced / Cloud fallback Google TTS.
- Home and TopBar voice readouts now prefer active TTS provider instead of Google TTS status.
- `npm run dev:localhost` was fixed on Windows by launching Vite through Node instead of `npx.cmd`.

## Still Limited

- Kokoro dependencies were not installed automatically. Current local smoke returned a clear Kokoro setup failure instead of audio.
- Piper is not used because standalone Piper synthesis is not implemented in this codebase.
- Browser speech fallback still depends on browser support and user gesture rules.
- Electron smoke was limited to verifying bridge exposure/build because launching the full Electron app was not required for this pass.

## Exact Test Results

- `npm test`: passed, 17/17 tests.
- `npm run build`: passed, TypeScript and Vite production build completed.
- `npm run health`: passed with backend running:
  - `/health`: ok
  - `/api/status`: ok
  - `/api/assistant/status`: ok
  - `/api/voice/status`: ok
  - `/api/greeting/startup`: ok
  - `/api/memory/status`: ok
  - `/api/memory`: ok
- API smoke:
  - `/api/voice/config`: `ttsProvider` is `kokoro`
  - `/api/voice/voices`: selected Kokoro voice is `af_heart`
  - `GET /api/greeting/startup`: ok
  - `POST /api/greeting/startup`: ok and returned varied greeting text
  - `POST /api/voice/tts`: returned `{ ok: false, provider: "kokoro", error: "Kokoro is not installed or failed dependency probing." }`
  - No Google provider was used by default.
- `npm run dev:localhost`: stack started after script fix.
- Playwright localhost UI smoke:
  - Home loaded
  - Voice page loaded
  - Settings page showed Local Kokoro TTS and Startup voice greeting controls
  - Console error count: 0
