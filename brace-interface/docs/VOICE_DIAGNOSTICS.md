# B.R.A.C.E Voice Diagnostics

Date: 2026-06-03

## Voice Pipeline

Frontend:

- `src/voice/useAudioRecorder.ts`
- `src/voice/useAudioPlayer.ts`
- `src/voice/useVoiceAgent.ts`
- `src/voice/VoiceControls.tsx`
- `src/voice/VoiceOrb.tsx`
- `src/voice/VoiceSettings.tsx`

Backend:

- `backend/voice/voiceService.cjs`
- `backend/voice/voiceStatus.cjs`
- `backend/assistant/voice/googleTtsProvider.cjs`

## Expected Flow

1. User starts voice.
2. UI verifies microphone permission.
3. Recorder starts listening.
4. Browser speech recognition produces partial/final transcript when available.
5. MediaRecorder plus backend transcription is available as fallback.
6. Final transcript is sent to the assistant.
7. Assistant returns text and optional Google TTS audio.
8. Cloud audio plays when available.
9. Browser speech synthesis is used when cloud audio is missing or fails.
10. Stop button cancels cloud audio and browser speech.
11. Orb returns to idle or muted.

## Current Status

Fixed:

- Mic start is permission-gated from the UI.
- Voice output off suppresses backend TTS request and frontend playback.
- Stop/interruption cancels cloud audio and browser speech.
- Cloud audio playback uses configured volume.
- Cloud audio pause/stop resolves the voice turn.
- Browser speech stops during voice hook cleanup.
- Voice events are logged through the backend.

Fallback behavior:

- Google TTS configured: assistant voice response may return MP3 data URL.
- Google TTS missing/failing: browser/system speech is used.
- Browser speech recognition missing: MediaRecorder can send audio to backend transcription.
- faster-whisper missing: backend transcription returns a clear setup error.

## Status Endpoints

```text
GET /api/voice/status
GET /api/voice/config
POST /api/voice/config
POST /api/voice/transcribe
POST /api/voice/log
```

`POST /api/voice/tts` currently returns 501 because standalone local synthesis is not exposed yet.

## Recommended Manual Checks

1. Open `http://127.0.0.1:5173`.
2. Open Voice.
3. Click Start.
4. Approve browser microphone permission.
5. Speak a short command.
6. Confirm transcript appears.
7. Confirm assistant response appears in Chat.
8. With Google TTS configured, confirm cloud audio plays.
9. Without Google TTS, confirm browser speech fallback plays.
10. Click Stop while speaking and confirm playback stops immediately.
11. Disable Text-to-speech in Settings and confirm no speech plays.

## Optional Google TTS Configuration

```env
TTS_PROVIDER=google
TTS_ENABLED=true
GOOGLE_APPLICATION_CREDENTIALS=C:\path\to\service-account.json
GOOGLE_TTS_VOICE_NAME=en-US-Chirp-HD-F
```

## Optional STT Configuration

Install faster-whisper in a Python environment available to B.R.A.C.E. If it is missing, voice status reports setup guidance and transcription fallback returns a recoverable error.

## Remaining Voice Work

- Expose a real standalone TTS endpoint for local providers.
- Wire Kokoro/Piper from status detection into actual synthesis.
- Add a voice dependency installer/checklist.
- Add browser-mode streaming events for live agent status if needed.
