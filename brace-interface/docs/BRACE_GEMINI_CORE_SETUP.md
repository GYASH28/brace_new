# B.R.A.C.E Gemini Core Setup

## Gemini

B.R.A.C.E now treats Gemini as the primary assistant brain. Save the key in Settings or set:

```env
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
GEMINI_FALLBACK_MODEL=gemini-2.5-flash-lite
```

Local model servers are optional. To show legacy provider controls, set `ENABLE_LEGACY_LOCAL_AI=true` or enable the Settings toggle.

## Memory

The backend retrieves memory before calling Gemini. Local JSON memory remains available, and the Obsidian adapter reads/writes Markdown under the configured B.R.A.C.E brain path:

```env
OBSIDIAN_VAULT_PATH=C:\Users\Admin\Documents\B.R.A.C.E-MAIN\BRACE-Brain
```

Firebase is optional and only runs when service-account variables are configured. Secrets are not stored in Firebase.

## Google TTS

Google Cloud TTS is optional. When configured, voice responses can return cached MP3 audio; when missing, B.R.A.C.E keeps using browser/system speech synthesis.

```env
TTS_PROVIDER=google
GOOGLE_APPLICATION_CREDENTIALS=C:\path\to\service-account.json
GOOGLE_TTS_VOICE_NAME=en-US-Chirp-HD-F
```

## Run And Verify

```powershell
npm test
npm run build
npm run dev -- --host 127.0.0.1 --port 5173
```

Manual checks:

- App starts without Ollama.
- Missing Gemini key shows a friendly error.
- `Remember that ...` saves memory without needing Gemini.
- Typed chat uses Gemini when a key is configured.
- Voice still falls back if Google TTS is unavailable.
