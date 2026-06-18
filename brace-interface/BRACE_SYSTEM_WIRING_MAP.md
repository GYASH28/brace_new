# BRACE System Wiring Map

## Startup Sequence
1. Electron `main.cjs` initializes `createBackend()`.
2. Backend loads configuration via `loadBraceEnv` and `stateStore`.
3. Electron sets up IPC and hotkeys.
4. Electron spawns `BrowserWindow` and loads Vite frontend.

## User Sends Message (Text)
1. Frontend sends IPC `assistant:chat` (Desktop) or POST `/api/assistant/chat` (Localhost).
2. `index.cjs` routes to `orchestrator.chat(payload)`.
3. Orchestrator detects mode (memory, code, voice).
4. `assistantContextBuilder` queries `firebaseMemory` and `obsidianMemory`.
5. Orchestrator sends context to `GeminiProvider`.
6. Gemini responds with text + tool calls.
7. Orchestrator executes tools via `assistantToolRegistry`.
8. Result stored in memory/history.
9. Response returned to frontend.

## Voice Input Pipeline
1. Frontend records microphone -> Base64 WebM.
2. IPC `voice:transcribe` / POST `/api/voice/transcribe`.
3. `voiceService.cjs` buffers to tmp file.
4. `transcribeWithFasterWhisper` spawned in Python.
5. Returns text -> Assistant.

## Voice Output Pipeline
1. Orchestrator TTS or explicit IPC `voice:tts`.
2. `voiceService.synthesize` prepares text (`speechTextProcessor`).
3. Tries `kokoroProvider` (local).
4. Fallback to `edge-tts` (Python script).
5. Fallback to `googleTtsProvider` (Cloud).
6. Returns Base64 audio -> frontend `<audio>` element.
