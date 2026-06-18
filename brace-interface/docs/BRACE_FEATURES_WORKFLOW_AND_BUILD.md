# B.R.A.C.E Features, Workflow, And Build Document

Date: June 3, 2026

## What B.R.A.C.E Is

B.R.A.C.E stands for Brain / Responsive / Agentic / Companion / Engine.

B.R.A.C.E is a localhost browser-first and optional Electron AI assistant built to combine conversational AI, local memory, voice control, safe tool execution, file analysis, project awareness, and system utilities. It is designed to feel like a personal command center: the user can chat, speak, inspect files, save memories, run approved local tasks, manage notes, monitor system state, and work with local projects while keeping sensitive actions behind permission gates.

The core idea is simple:

1. The user gives B.R.A.C.E a command through chat, voice, quick actions, or a page-specific workflow.
2. B.R.A.C.E gathers relevant local context such as memories, selected files, project paths, notes, and settings.
3. The backend routes the request to Gemini or local-safe logic.
4. If tools are needed, B.R.A.C.E checks permissions and risk levels before running them.
5. The result is returned to the interface, logged, optionally spoken aloud, and optionally saved to memory or chat history.

## Localhost Runtime Update

B.R.A.C.E can now run without an EXE:

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

The browser UI talks to the backend at:

```text
http://127.0.0.1:8787
```

Electron desktop mode still exists, but it is no longer required for local development/runtime use.

## Main Features

### Home Command Center

The Home page is the main control surface. It shows the B.R.A.C.E orb, status badges, quick actions, assistant mode controls, and the command dock.

Home includes:

- B.R.A.C.E identity and live orb state
- Brain status
- Voice status
- Memory status
- Tool safety status
- Quick actions such as opening VS Code, searching files, summarizing files, planning the day, opening projects, and voice settings
- Command input with Agent, Chat, Code, and Voice modes
- Microphone and send controls

### Chat

The Chat page lets the user talk to B.R.A.C.E using typed prompts.

Chat supports:

- Gemini-powered assistant responses
- Backend memory retrieval
- File/project-aware context
- Tool call summaries
- Retry for failed prompts
- Chat export
- Chat clearing
- Pending assistant message while B.R.A.C.E is thinking
- Safe error reporting when the AI provider is unavailable

### Voice

Voice mode lets the user speak commands and hear responses.

Voice supports:

- Microphone input
- Browser speech recognition when available
- Backend transcription through faster-whisper when browser speech recognition is unavailable and local STT is installed
- Voice activity detection through browser audio volume monitoring
- Partial transcript display
- Final transcript handling
- Browser speech synthesis fallback
- Google TTS playback when configured
- Cloud TTS fallback to browser speech if playback fails
- Manual stop for browser speech and cloud audio
- Voice configuration for language, speed, pitch, volume, silence timeout, max recording time, interruption, and continuous listening
- Voice status and dependency checks

### Agent

The Agent page displays local agent tasks and approvals.

Agent features include:

- Command interpretation
- Task planning
- Risk classification
- Approval requests for risky actions
- Agent task tracking
- Approval and rejection controls
- Tool execution through a guarded backend runtime

### Tasks

The Tasks page manages user-defined assistant tasks.

Task capabilities include:

- Open VS Code
- Open folders
- Open URLs
- Launch configured apps
- Start focus timers
- Preview folder cleanup or organization
- Save task lists locally
- Run tasks through permission-aware backend handlers

### Files

The Files page lets B.R.A.C.E work with selected or dropped files.

File features include:

- Select files through the desktop dialog
- Drag and drop supported files
- File metadata display
- Summarize files
- Explain files
- Extract key points
- Ask questions about selected files
- PDF, DOCX, text, Markdown, CSV, JSON, code, HTML, CSS, and image metadata support
- Size cap for dropped text files to prevent renderer memory overload
- Backend permission checks for selected file analysis

### Memory

Memory lets B.R.A.C.E store and search useful user-approved knowledge.

Memory features include:

- Save memory records
- Search saved memories
- Update memories
- Delete memories
- Local memory persistence
- Secret redaction before saving
- Memory types such as preference, project, tool, routine, and conversation
- Optional Obsidian memory adapter
- Optional Firebase sync when credentials are configured

### Notes

The Notes page is for creating, reading, searching, updating, and deleting local notes.

Notes support:

- Create notes
- Search notes
- Read notes
- Update notes
- Delete notes
- Backend-managed local note storage
- Secret redaction for note content

### Tools

The Tools page exposes available backend tools.

Tool features include:

- Tool listing
- Tool metadata
- Risk level display
- Required permission display
- Dry-run support for supported tools
- Safe-mode integration

Tool categories include:

- File tools
- Folder tools
- App tools
- System tools
- Web tools
- Command tools
- Coding tools
- Browser tools
- Git tools
- Memory tools
- MCP tools

### Projects

Projects let B.R.A.C.E understand local development workspaces.

Project features include:

- Add project folder
- Scan project metadata
- Detect package scripts
- Inspect git status
- List project entries
- Use the active project as context for assistant requests

### System

The System page monitors local system information.

System features include:

- CPU usage
- RAM usage
- Storage status
- GPU status when available
- Network status
- Battery/power status
- OS platform, release, architecture, hostname, and uptime
- Permission-gated access to system information

### Apps

The Apps page manages app launcher entries.

App features include:

- Add executable apps manually
- Store app name and path
- Launch configured apps
- Delete app entries
- Permission-gated app launching

### Permissions

The Permissions page controls local capabilities.

Permissions include:

- Microphone
- AI model access
- File access
- File write
- Folder access
- Shell command
- App launching
- Coding agent edits
- Memory read
- Memory write
- Browser automation
- MCP tools
- Git operations
- System information
- Notifications
- Startup
- Admin-required actions

Each permission is explicit, revocable, and logged.

### Logs

Logs provide an audit trail of local activity.

Log features include:

- List activity logs
- Clear logs
- Copy individual log entries
- Record settings changes
- Record permission changes
- Record AI requests
- Record tool actions
- Record voice events
- Record errors

### Settings

Settings configure the assistant.

Settings include:

- Gemini model
- Gemini fallback model
- Temperature
- Max tokens
- Gemini API key
- Optional legacy/local AI providers
- Obsidian memory
- Firebase sync
- Google TTS
- Google TTS voice name
- Voice output
- Wake word toggle
- Voice rate and pitch
- Hotkeys
- Offline mode
- Streaming toggle
- Safe mode
- Admin mode
- Clear all local data

## B.R.A.C.E Workflow

### 1. Startup Workflow

When B.R.A.C.E starts in localhost mode:

1. `scripts/dev-localhost.cjs` starts `backend/server.cjs`.
2. The backend binds to `127.0.0.1:8787`.
3. Vite starts at `127.0.0.1:5173`.
4. The React app loads in a browser.
5. `src/lib/braceClient.ts` selects HTTP mode because `window.braceDesktop` is not present.
6. The UI asks the backend for state, tools, memories, notes, projects, assistant status, and voice status.
7. Chat, memory, logs, settings, permissions, voice status, projects, notes, files, and tools work through HTTP routes.

When B.R.A.C.E starts in Electron desktop mode:

1. Electron opens the desktop window.
2. The Electron main process creates the backend.
3. The backend loads environment variables and local state.
4. The state store creates or reads the local app state file.
5. Permissions, settings, logs, tasks, apps, memories, notes, approvals, and chat history are loaded.
6. IPC handlers are registered.
7. The React renderer loads the interface.
8. `src/lib/braceClient.ts` selects Electron IPC mode.
9. The UI becomes ready for chat, voice, tasks, files, and tools.

### 2. Chat Workflow

When the user sends a chat message:

1. The renderer adds the user message to chat.
2. A pending assistant message appears.
3. The renderer calls the Electron bridge method `assistantChat`.
4. Electron forwards the request to the backend assistant orchestrator.
5. The orchestrator detects the mode: normal, memory, coding, agent, voice, or project.
6. The backend builds assistant context from memory, selected files, projects, and conversation history.
7. Gemini receives the prompt, system instructions, memory summary, conversation, and tool declarations.
8. If Gemini requests tools, B.R.A.C.E runs approved/safe tools through the tool runner.
9. If tool results are needed, Gemini gets a second request with tool outputs.
10. The final response returns to the renderer.
11. The pending assistant message is replaced with the final response.
12. Logs, agent state, assistant status, and chat history update.

### 3. Voice Workflow

When the user starts voice:

1. The UI clears prior voice errors.
2. The mic starts if permission is available.
3. B.R.A.C.E monitors audio volume for speech and silence.
4. If browser speech recognition exists, it listens for partial and final transcripts.
5. If browser speech recognition is unavailable, B.R.A.C.E can record audio and send it to backend transcription.
6. The final transcript is added as a user message.
7. The transcript is sent through the assistant workflow.
8. The response is saved as the last voice response.
9. If Google TTS returns audio, B.R.A.C.E tries to play it.
10. If cloud TTS fails or is unavailable, browser speech synthesis speaks the response.
11. The orb returns to idle after playback.

### 4. File Analysis Workflow

When the user analyzes a file:

1. The user selects a file or drops a supported text file.
2. B.R.A.C.E checks file access permission.
3. The backend validates the file path against safe access rules.
4. The backend extracts text or metadata.
5. The requested action runs: summarize, explain, key points, or question answering.
6. The result appears in the Files page.
7. The action is logged.

### 5. Agent And Tool Workflow

When the user asks B.R.A.C.E to perform a local task:

1. The command is classified.
2. A plan is created.
3. Each step receives a risk level and required permission.
4. Low-risk safe actions can run directly when permission allows.
5. Higher-risk actions generate approval requests.
6. The user approves or rejects.
7. Approved steps execute through the tool router.
8. Results are collected and shown to the user.
9. Logs and task state update.

### 6. Memory Workflow

When the user asks B.R.A.C.E to remember something:

1. The assistant detects memory mode.
2. The memory text is extracted.
3. Secrets are redacted.
4. A local memory record is saved.
5. If enabled, Obsidian memory is updated.
6. If configured, Firebase memory sync runs with a timeout.
7. The user receives a confirmation.

## How B.R.A.C.E Is Made

### Application Stack

B.R.A.C.E is built with:

- Electron for the optional desktop shell
- Node HTTP backend for localhost browser mode
- React for the renderer UI
- TypeScript for frontend typing
- Vite for development and production builds
- Node.js CommonJS backend modules
- Gemini API for the primary AI brain
- Optional Google Cloud Text-to-Speech
- Optional Firebase Admin for cloud memory sync
- Optional Obsidian-style local Markdown memory
- Browser Web Speech APIs for fallback speech recognition and synthesis
- faster-whisper as an optional local speech-to-text backend
- Tailwind CSS and custom CSS for the interface
- Lucide React icons
- Framer Motion for animation
- Node test runner for backend tests
- Playwright for UI smoke testing

### Localhost Adapter Layer

The renderer calls `braceClient`, not Electron APIs directly.

`braceClient` selects:

- `window.braceDesktop` when running inside Electron.
- HTTP requests to `VITE_BRACE_API_BASE_URL` or `http://127.0.0.1:8787` when running in browser mode.

This keeps one UI code path for state, settings, chat, assistant calls, memory, notes, tools, projects, logs, permissions, and voice status.

### Folder Structure

Important project areas:

- `electron/` contains the Electron main and preload scripts.
- `backend/` contains local logic, tools, AI routing, memory, notes, projects, voice, security, and agent runtime.
- `backend/assistant/` contains the assistant orchestrator, Gemini provider, context builder, memory adapters, tool registry, response formatting, and TTS adapter.
- `backend/voice/` contains voice configuration, dependency status, transcription service, and voice provider status helpers.
- `backend/tools/` contains local tool implementations.
- `backend/security/` contains permission, path safety, risk analysis, and secret scanning.
- `src/` contains the React interface.
- `src/voice/` contains voice hooks and voice UI components.
- `src/components/` contains shared interface components.
- `src/data/` contains navigation and UI data.
- `docs/` contains project documentation.

### Electron Layer

Electron provides:

- Desktop window
- Dark native theme
- Secure renderer settings
- Context isolation
- Preload bridge
- IPC handlers
- Global hotkeys
- External URL handling
- App lifecycle handling

The preload script exposes a safe `window.braceDesktop` API. The renderer never directly imports backend code or Node APIs.

### Backend Layer

The backend is created inside Electron main. It owns:

- State store
- Activity logger
- Memory manager
- Notes manager
- Voice service
- Tool registry
- Tool router
- Agent runtime
- Approval manager
- Assistant orchestrator
- Security guardrails

This keeps sensitive work outside the renderer.

### Assistant Layer

The assistant orchestrator:

- Builds configuration from settings and environment variables
- Creates memory adapters
- Creates Google TTS adapter
- Builds context
- Calls Gemini
- Handles tool calls
- Saves optional Firebase records
- Returns response text, tool summaries, memory summaries, model info, and optional audio

Gemini is the primary model provider. Legacy local providers can be enabled, but the current design makes Gemini the main cloud brain.

### Voice Layer

Voice is made from:

- `useAudioRecorder` for mic capture, Web Speech, MediaRecorder fallback, VAD-like silence detection, cleanup, and backend transcription
- `useAudioPlayer` for browser speech synthesis
- `useVoiceAgent` for transcript-to-assistant workflow, error handling, TTS playback, and voice state
- `VoiceOrb` for visual state
- `VoiceControls` and `VoiceSettings` for user controls
- `voiceService.cjs` for backend config, status, logging, and faster-whisper transcription

### Security Layer

B.R.A.C.E uses several safety controls:

- Explicit permissions
- Safe folders
- Path guard
- Command risk analyzer
- Secret scanner
- Tool risk levels
- Approval workflow
- Safe mode
- Local audit logs
- IPC bridge instead of direct renderer backend access

### Performance And Reliability Choices

Recent production hardening includes:

- Cached voice dependency checks
- Shorter voice probe timeouts
- Central IPC timeouts
- Optional Firebase/TTS deadlines
- Command timeout completion
- Command output caps
- Windows process-tree termination for timed-out commands
- Debounced chat persistence
- Dropped text file size limits
- Fewer voice volume re-renders
- No runtime Google Fonts dependency
- Voice cleanup for unsupported speech APIs
- Real TTS fallback after cloud audio failure

## Current Production Readiness Notes

B.R.A.C.E is now stronger in these areas:

- More responsive status checks
- Better voice failure recovery
- Safer local command execution
- Better renderer memory safety
- More accessible permission and command palette controls
- Cleaner offline startup behavior
- Clearer assistant error handling

Recommended future improvements:

- Move all heavy process and dependency probes fully out of Electron main
- Add frontend component tests
- Add accessibility tests
- Add a packaged installer flow
- Add first-run onboarding for Gemini key, microphone permission, and faster-whisper setup
- Add a voice dependency installer/checklist screen
- Add streaming assistant responses
- Add richer project indexing
- Add safer background workers for large PDF/DOCX parsing

## Quick Summary

B.R.A.C.E is a localhost browser-first AI command center with optional Electron desktop mode. It combines Gemini chat, local memory, voice, file analysis, project tools, safe task execution, permissions, logs, system monitoring, and app launching. It is made with React, TypeScript, Vite, Node.js backend modules, a localhost HTTP server, optional Electron, Gemini, optional Google TTS, optional Firebase, local memory, and permission-gated tools.

The workflow is: user command -> frontend bridge -> backend orchestrator -> memory/context/tools -> Gemini/local logic -> response -> logs/memory/voice/UI update.
