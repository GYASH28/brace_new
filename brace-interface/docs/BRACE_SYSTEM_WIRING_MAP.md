# BRACE System Wiring Map

## USER SENDS MESSAGE
UI input component
-> `braceClient.assistantChat(input)` (Frontend)
-> `POST /api/assistant/chat` (HTTP Backend)
-> `orchestrator.cjs` (Provider Router)
-> `NvidiaProvider` / `GeminiProvider`
-> Remote LLM Generation (`https://integrate.api.nvidia.com/...`)
-> Response Parser & Tool Executor (FSM inside `orchestrator`)
-> `obsidianMemory.cjs` (Memory update if requested)
-> JSON Response to UI
-> Frontend Response Display
-> Optional TTS execution (`voiceOrb` speaking state)

## VOICE INPUT
Mic button
-> `useAudioRecorder` & permission check
-> Audio capture via browser
-> STT Provider (Whisper or WebSpeech API)
-> Transcript generated
-> Pushed to `chatInput` field

## VOICE OUTPUT
Assistant text generated
-> Text Sanitizer (removes markdown/symbols)
-> TTS Provider (`googleTtsProvider.cjs` or browser fallback)
-> Audio generation/stream
-> `useAudioPlayer` playback
-> `voiceOrb` speaking state triggers
-> Stop/cancel handling clears buffers

## STARTUP
App Launch (`npm run dev:localhost`)
-> `defaultConfig.cjs` / `assistantConfig.cjs` loads
-> Backend binds to port 8787
-> Provider check (NVIDIA/Gemini credentials validated)
-> Memory check (Obsidian Vault path resolved)
-> Frontend Vite server binds to port 5173
-> Frontend `useEffect` calls `GET /health`
-> Greeting generation triggered (if enabled)
-> UI ready state unlocked
