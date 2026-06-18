# B.R.A.C.E Complete Voice Assistant Codebase Audit

**Audit date:** 17 June 2026  
**Audited artifact:** `brace-interface.zip`  
**Audit method:** Static architecture review plus safe, non-destructive build, type-check, test, dependency, and startup validation  
**Implementation changes made:** None. This report follows the supplied instruction to audit before rewriting.  
**Overall confidence:** High for source-code findings; medium for microphone, audio-device, cloud-provider, and Windows-runtime behavior that require the intended machine and valid provider credentials.

> **Security note:** The uploaded archive contains an actual `.env` file and hardcoded provider credentials. This report intentionally does not reproduce any secret value. Treat the exposed credentials as compromised and rotate them before further development.

---

## 1. Executive Summary

B.R.A.C.E is **repairable and does not need a full rewrite**, but its current core request path is not reliable enough to be treated as a working voice assistant. The strongest parts are the modern React/Vite interface foundation, the existence of provider abstractions, bounded command execution, local SQLite persistence, defensive log redaction, and the separation between visible answer text and speech-cleaned text. The weakest parts are frontend–backend contract drift, broken memory/history wiring, an incomplete approval system for agent tools, configuration drift, and a voice pipeline whose advertised providers do not match the code path actually used at runtime.

The most serious functional defect is a **response-schema mismatch**. `src/lib/braceClient.ts` unwraps successful HTTP responses and returns only `payload.data`, while several screens still expect `{ ok, ... }`. Therefore the backend can return a valid assistant answer, chat history, settings, or project list, yet the frontend interprets it as failure. This breaks text chat, voice-command answers, history loading, settings loading, and several secondary screens.

The most serious security defect is credential exposure. The archive contains a populated `.env`, including live-looking Gemini and Firebase secrets, and the source has a hardcoded NVIDIA credential in two configuration modules. These credentials must be revoked or rotated immediately, removed from the repository and all distributable archives, and replaced with a safe secret-loading mechanism.

The assistant does not currently have a dependable long-term memory loop. Local chat rows use `content`, while the context builder reads `text`; local chat is also not saved by the main UI. Memory-manager methods are asynchronous but several API handlers and the orchestrator call them without `await`, causing serialized promises, undefined response fields, and test-time unhandled rejections. Firebase “search” does not search by the query; it fetches a limited set of documents.

The voice system has useful building blocks but is only partially integrated. The active VAD is a fixed browser RMS threshold, not Silero despite configuration/status language. Faster-whisper is spawned as a new Python process and loads a model for every utterance, which is too slow and memory-heavy. The frontend does not automatically fall back to browser speech recognition when the backend reports that faster-whisper is unavailable. The primary Kokoro server script is absent from the ZIP and its path resolves outside the repository, so Kokoro cannot start from this artifact. TTS is non-streaming and old synthesis/LLM requests cannot be cancelled, allowing stale speech to play after a newer command.

### Top five actions

1. **Rotate all exposed credentials and remove `.env`, `node_modules`, and generated output from distributions.**
2. **Define one shared API contract and repair the assistant, chat, state, settings, project, voice, and memory consumers.**
3. **Repair conversation and memory persistence:** normalize `content` versus `text`, await all memory calls, and connect UI history to the same history sent to the model.
4. **Replace per-request Whisper startup with a persistent STT worker and make provider fallback status-driven.**
5. **Add a real request state machine with cancellation, request IDs, tool approvals, and stale-audio protection.**

### Overall condition

| Area | Condition | Summary |
|---|---|---|
| Startup/build portability | Broken in the uploaded artifact | Bundled `node_modules` contains platform-specific native binaries and missing optional native bindings. A clean target-platform install is required. |
| Text assistant | Broken in main UI | Valid backend data is unwrapped by the client, then rejected by UI code expecting a wrapper. |
| Voice input | Partially working | Browser recording and RMS VAD exist; backend STT fallback and lifecycle are unreliable. |
| LLM routing | Partially working | Gemini/NVIDIA providers exist, but defaults, key ownership, model selection, errors, and tool protocol drift. |
| Agent tools | Partially implemented/disconnected | Low-risk tools can execute; medium/high-risk calls stop at “needs approval” with no approval workflow. |
| Memory/history | Broken | Async misuse, schema mismatch, missing chat save, weak Firebase retrieval, and no user scoping. |
| TTS/playback | Partially working, primary provider unavailable | Text cleanup is good, but Kokoro script is missing, synthesis is non-streaming, and cancellation is incomplete. |
| Security/privacy | Critical remediation required | Secrets are shipped in the archive and hardcoded in source; local APIs have no request authentication. |
| Tests/observability | Incomplete | 20/25 tests pass, five fail; no end-to-end voice test or unified trace IDs. |

---

## 2. Architecture Overview

### 2.1 Technology inventory

| Area | Detected technology | File evidence | Purpose | Main concern |
|---|---|---|---|---|
| Frontend UI | React 19, TypeScript, Vite 8 | `package.json`; `src/main.tsx`; `src/App.tsx` | Browser/localhost application shell | No shared typed API contracts; core screens consume incompatible response shapes. |
| Styling/animation | Tailwind CSS 4, Framer Motion, Lucide | `package.json`; `src/index.css`; `src/components/Interface.tsx` | Futuristic interface, icons, transitions | Several effects are decorative rather than driven by real audio/state; large mixed-responsibility components. |
| Backend runtime | Node.js CommonJS and core `http` | `backend/server.cjs`; `backend/index.cjs` | Local API server and static hosting | Route definitions are centralized in one large file; inconsistent envelopes and weak validation. |
| Realtime transport | Server-Sent Events | `backend/server.cjs` `/api/events` | Intended status/event channel | No heartbeat, event ID, reconnect protocol, or meaningful event production. |
| Persistence | SQLite via `better-sqlite3` | `backend/db/*`; `backend/config/stateStore.cjs` | Settings, chat, tasks, apps, memory | Platform-native binary in uploaded `node_modules`; plaintext secrets; chat schema mismatch. |
| Cloud memory | Firebase Admin/Firestore | `backend/assistant/memory/firebaseMemory.cjs` | Conversation/fact persistence | No user scoping; query is ignored in “search”; archive contains Firebase private key material. |
| Local knowledge | Obsidian/Markdown vault integration | backend memory/note modules; config | Personal brain and notes | Hardcoded Windows vault path; repository root calculation is wrong. |
| LLM | Google Gemini and NVIDIA NIM | `backend/assistant/providers/*`; config modules | Answer generation and tool selection | Default/provider/model/key drift; no token budget or streaming; tool results use fragile formatting. |
| STT | Browser Web Speech and Python `faster-whisper` | `src/voice/useAudioRecorder.ts`; `backend/voice/voiceService.cjs` | Voice transcription | New Python/model process per utterance; broken automatic fallback; no streaming partials. |
| VAD | Browser analyser RMS threshold | `src/voice/useAudioRecorder.ts` | Start/stop based on amplitude | Configuration may say Silero, but backend Silero VAD is not used. No adaptive noise floor or pre-roll. |
| TTS | Kokoro local HTTP server, Edge TTS, optional Google Cloud, browser SpeechSynthesis | `backend/voice/*Provider.cjs`; `src/voice/useVoiceAgent.ts` | Spoken response | Kokoro script absent/outside ZIP; no streaming; voice preset mismatch; incomplete cancellation. |
| File/text extraction | Mammoth and PDF parsing | `package.json`; backend file tools | Analyze user-selected documents | Path guard does not protect every registered file tool. |
| System diagnostics | `systeminformation` | `package.json`; backend system tools | Hardware/status reporting | Permission and response shape are inconsistent; status probes can block. |
| Testing | Node test runner; Playwright installed | `package.json`; `backend/__tests__/*` | Unit/backend checks | No Playwright E2E coverage; five current failures; no microphone/provider mocks. |
| Packaging | Localhost browser app; no Electron/Tauri package | `package.json`; `scripts/dev-localhost.cjs` | Serve frontend and backend locally | `productName`/`main` suggest desktop intent, but current artifact is a localhost web app. |

### 2.2 Repository map

```text
brace-interface/
├─ src/                         React frontend
│  ├─ App.tsx                   Main mounted application and chat/voice orchestration
│  ├─ lib/braceClient.ts        HTTP/bridge client and response unwrapping
│  ├─ voice/                    Recorder, player, TTS cleanup, voice settings/state
│  ├─ os/                       Orb, briefing, workspace shell, window manager
│  ├─ apps/                     Older/orphaned assistant, explorer, settings, monitor apps
│  └─ components/Interface.tsx  Large UI component collection
├─ backend/
│  ├─ server.cjs                HTTP server, routes, CORS, static serving, SSE
│  ├─ index.cjs                 Dependency composition and handler assembly
│  ├─ assistant/                Orchestrator, providers, context, tools, memory, skills
│  ├─ voice/                    STT/TTS provider implementations and status/config
│  ├─ tools/                    File, command, app, coding, browser, system tools
│  ├─ config/                   Defaults and SQLite-backed state store
│  ├─ db/                       SQLite connection/schema/migrations
│  └─ __tests__/                Node unit/backend tests
├─ docs/                        Prior audits and implementation notes
├─ scripts/                     Localhost launcher and health check
├─ dist/                        Generated frontend build included in archive
├─ node_modules/                Platform-specific dependency tree included in archive
├─ .env                         Populated secrets included in archive — critical issue
└─ package.json                 Scripts and dependency manifest
```

The backend contains hundreds of files because a large collection of agent-skill assets is copied into `backend/assistant/skills`. These are mostly documentation/scripts rather than active core modules. They increase distribution size and attack/review surface and should be packaged separately or indexed on demand.

### 2.3 Entry-point map

| Entry point | File | Role | Notes |
|---|---|---|---|
| Frontend bootstrap | `src/main.tsx` | Mounts the React application | Primary browser entry. |
| Main UI | `src/App.tsx` | Loads history/status, sends prompts, controls voice, renders shell | Contains core response-schema bugs and hardcoded personalization. |
| HTTP client | `src/lib/braceClient.ts` `createHttpClient()` | Calls local API and unwraps `{ok,data}` | Correctly centralizes HTTP, but consumers have not migrated to its return contract. |
| Backend server | `backend/server.cjs` | Creates HTTP server, CORS, limits, routes, static frontend | Main runtime startup via `npm start`. |
| Dependency composition | `backend/index.cjs` `createBackend()` | Creates DB, state, providers, tools, voice, handlers | Calculates repository root incorrectly. |
| Database initialization | backend DB modules called by `createBackend()` | Opens/migrates SQLite | Native binary must match target OS. |
| Agent initialization | assistant configuration/orchestrator in `createBackend()` | Creates provider router, memory, tools, context, response formatter | Provider defaults and key/model selection drift. |
| Voice initialization | `createVoiceService()` | Loads voice config/status, controls providers | Kokoro starts lazily and points outside the archive. |
| Localhost launcher | `scripts/dev-localhost.cjs` | Starts backend/frontend development services | Development convenience, not production process supervision. |

### 2.4 Actual architecture diagram

```text
                                    ┌──────────────────────────────┐
                                    │ React UI: src/App.tsx        │
                                    │ chat + orb + workspace shell │
                                    └──────────────┬───────────────┘
                                                   │
                        text prompt / base64 audio │ HTTP JSON
                                                   v
┌───────────────┐   MediaRecorder / Web Speech   ┌──────────────────────────────┐
│ Microphone    ├───────────────────────────────►│ src/lib/braceClient.ts       │
└──────┬────────┘                                 │ unwraps {ok,data} to data    │
       │ analyser RMS                             └──────────────┬───────────────┘
       v                                                         │
┌──────────────────────────┐                                     v
│ Browser threshold VAD    │                     ┌──────────────────────────────┐
│ useAudioRecorder.ts      │                     │ backend/server.cjs           │
└────────────┬─────────────┘                     │ routes, CORS, limits, SSE    │
             │ audio blob/base64                  └──────────────┬───────────────┘
             v                                                    │ handlers
┌──────────────────────────┐                                      v
│ /api/voice/transcribe    │                     ┌──────────────────────────────┐
│ voiceService.cjs         │                     │ backend/index.cjs            │
│ spawns Python per turn   │                     │ dependency composition       │
│ faster-whisper model     │                     └───────┬─────────┬────────────┘
└────────────┬─────────────┘                             │         │
             │ transcript                                │         │
             └──────────────────────────────────────────►│         │
                                                        v         v
                                               ┌─────────────┐  ┌────────────────┐
                                               │ Orchestrator│  │ SQLite/Firebase│
                                               │ context +   │  │ memory/history │
                                               │ LLM + tools │  └────────────────┘
                                               └──────┬──────┘
                                                      │ Gemini/NVIDIA full response
                                                      v
                                               ┌─────────────┐
                                               │ Final text  │
                                               └──────┬──────┘
                                                      │ returned to React
                                                      v
                                               ┌────────────────────┐
                                               │ Speech text cleanup│
                                               │ visible text kept  │
                                               └─────────┬──────────┘
                                                         │ /api/voice/tts
                                                         v
                          ┌──────────────────────────────────────────────────┐
                          │ Kokoro (missing external script) → Edge → Google │
                          │ → browser SpeechSynthesis fallback              │
                          └──────────────────────┬───────────────────────────┘
                                                 │ complete base64 audio
                                                 v
                                          ┌──────────────┐
                                          │ HTML Audio   │
                                          │ orb state    │
                                          └──────────────┘
```

### 2.5 Main data-flow defect

The backend generally sends:

```json
{ "ok": true, "data": { "success": true, "message": "..." } }
```

`braceClient.request()` returns only `payload.data`. The mounted `App.tsx` then checks `result.ok` and `result.message.text`. The actual returned object has `success` and a string `message`. This is the central contract failure.

---

## 3. Current Feature Status

| Feature | Status | Evidence | Main problem | Recommendation |
|---|---|---|---|---|
| Main text chat | **Broken** | `src/App.tsx:71-77`; `src/lib/braceClient.ts:104-117` | Client unwraps response, but UI expects wrapper and nested message object. | Introduce typed `AssistantReply` and consume `result.message` directly. |
| Startup chat history | **Broken** | `src/App.tsx:25-30`; `backend/config/stateStore.cjs` | UI expects `{ok,messages}`; client returns array. Main app never saves new chat. | Normalize message schema and persist after each accepted turn. |
| Voice recording | **Partially Working** | `src/voice/useAudioRecorder.ts` | Browser capture exists, but timer cleanup and backend fallback are unreliable. | Repair lifecycle, use state-driven provider selection, add request aborts. |
| VAD | **Partially Working / Misrepresented** | `useAudioRecorder.ts`; `backend/voice/vadManager.cjs` | Actual VAD is fixed RMS threshold; Silero module is configuration-only. | Either label it accurately or integrate a real local VAD worker. |
| Faster-whisper STT | **Requires Runtime Verification; architecture unsuitable** | `backend/voice/voiceService.cjs:63-88` | Spawns Python and loads model per utterance; no persistent worker or automatic fallback. | Persistent process/model, health probe, queue, timeout/cancel, format normalization. |
| Browser STT fallback | **Partially Working** | `useAudioRecorder.ts` provider selection | Used only when local config already says browser; backend unavailability does not trigger it. | Base selection on `/api/voice/status`; retry once through browser where supported. |
| Wake word | **Not Implemented** | Only configuration references found | No detector or activation service. | Hide setting until implemented or integrate an explicit wake-word engine. |
| Gemini provider | **Partially Working** | assistant provider modules | Key/model ownership and fallback handling drift; connectivity not tested to protect credentials. | Separate provider config, classify retryable errors, add mocks/contract tests. |
| NVIDIA provider | **Partially Working / Security blocked** | config/provider modules | Hardcoded credential; default conflicts with tests/UI. | Rotate key, remove hardcoding, make selected provider explicit. |
| Tool calling | **Partially Working** | `backend/tools/toolRegistry.cjs`; assistant tool registry | Low-risk tools may run; medium/high tools stop at approval with no way to approve. | Build persisted approval workflow and enforce permissions for every tool. |
| Dangerous tool execution | **Disconnected, currently safer by default** | `/api/tools/run` explicitly blocked | Approval execution is absent; legacy task/app endpoints remain callable. | Keep blocked until authenticated approval and path/command policy are complete. |
| Local memory CRUD | **Broken** | `memoryManager.cjs`; server memory routes | Async methods are returned without `await`; responses serialize incorrectly. | Await handlers and add integration tests for every CRUD route. |
| Memory use in agent | **Broken/partial** | orchestrator and context builder | Promise misuse plus `content`/`text` mismatch; history not saved. | One canonical message schema and transactional turn persistence. |
| Firebase memory search | **Mock-like/incorrect** | `firebaseMemory.cjs:91-99` | Query value is ignored. | Implement scoped indexed search or do not call it search. |
| Obsidian brain | **Partially Working / non-portable** | default config and path hints | Hardcoded absolute Windows paths; repository root points outside project. | User-selectable vault, validated path, migration from old defaults. |
| Kokoro TTS | **Broken in uploaded artifact** | `kokoroProvider.cjs:15-23` | Expected Python server script is not present and path resolves outside repo. | Vendor/document installer for service or configure an explicit external service path. |
| Edge TTS fallback | **Requires Runtime Verification** | `edgeTtsProvider.cjs` | Depends on target Python environment and network; not bundled safely. | Startup health check and explicit user-visible provider state. |
| Browser TTS fallback | **Working with UX issues** | `useVoiceAgent.ts` | Can speak when backend TTS fails, but UI still reports failure; prosody is limited. | Treat successful fallback as degraded success and show provider badge. |
| Speech text cleanup | **Working** | frontend/backend speech processors; ten passing tests | Double sanitization may over-transform rare content. | Make backend canonical and test technical/Hinglish cases. |
| Speech interruption | **Partially Working** | audio player/voice agent | Stops current element/speech synthesis, but cannot cancel in-flight LLM/TTS. | Request generation IDs and end-to-end AbortController propagation. |
| Voice settings | **Partially Working / misleading** | `VoiceSettings.tsx`; `useVoiceAgent.ts` | Selected preset can change UI while explicit `kokoroVoice` still wins. | Store one resolved voice identifier per provider and verify on save. |
| Settings screen | **Broken and likely orphaned** | `src/apps/SettingsApp.tsx` | Expects wrapped state; current main app does not mount it. | Decide active shell, delete/archive orphan or fully wire it. |
| Project explorer | **Broken and orphaned** | `src/apps/ExplorerApp.tsx` | Response mismatch and not mounted. | Migrate to shared client types before exposing it. |
| System status | **Partially Working** | status handlers and UI polling | Inconsistent inner shape, permission behavior, synchronous provider probes. | Async cached health service and one typed status contract. |
| SSE events | **Disconnected** | `/api/events`; `sendEvent` in `backend/index.cjs` | Event channel exists but meaningful events are not produced or consumed. | Add typed event broker, heartbeat, IDs, and reconnect state or remove SSE. |
| File attachment button | **Disconnected** | main chat input rendered without attachment handler | Visible control performs no action. | Disable/hide until file-selection/analyze flow is wired. |
| Workspaces/briefing | **Mostly Mocked** | workspace components; `ExecutiveBriefing.tsx` | Hardcoded/fake success statements and decorative data. | Label demos, connect real data, or remove from production navigation. |

---

## 4. End-to-End Voice Flow

The following is the real flow inferred from the mounted application. “Confirmed” means the source directly implements it; “runtime verification” means a browser/device/provider is needed.

| Step | Actual implementation | Input → output | Failure/cancellation behavior | Finding |
|---:|---|---|---|---|
| 1 | User presses microphone control in `App.tsx`/voice hook | Click → `startListening()` | No wake-word activation | Manual activation only. |
| 2 | `getUserMedia` in `useAudioRecorder.ts` | Browser permission → stream | Permission errors returned to UI | Basic handling exists. |
| 3 | Default input opened with audio constraints | Device → `MediaStream` | No device picker or persistent selected device | Echo cancellation/noise suppression/AGC are requested. |
| 4 | `MediaRecorder` captures encoded browser audio | Stream → chunks/blob | Codec depends on browser | No explicit sample rate/channel/codec normalization. |
| 5 | Web Audio analyser computes RMS | Samples → volume | Fixed threshold and sensitivity | This is the real VAD. |
| 6 | Silence/max-duration timers decide stop | RMS/timers → recorder stop | Timer cleanup bug can leave loop active | No adaptive noise floor or pre-roll. |
| 7 | Chunks combined and converted | Blob → base64 payload | Server JSON limit may reject long audio before 20 MB STT limit | Effective limit conflict. |
| 8 | `braceClient.transcribeVoice()` | JSON → `/api/voice/transcribe` | No AbortController | Old transcription can continue. |
| 9 | `voiceService.cjs` decodes/writes temp file | base64 → temp audio file | Deletes by default after operation | Retention is unclear when raw-audio saving is enabled. |
| 10 | Python subprocess imports faster-whisper | temp file → transcript | 120 s child timeout; HTTP may time out first | Model is recreated for every utterance. |
| 11 | Transcript returns through HTTP client | wrapped response → unwrapped data | Automatic browser fallback is not status-driven | Backend-unavailable local STT can simply fail. |
| 12 | Transcript is shown/used by voice agent | text → UI state | State may be set idle while transcription is still active | Voice state is a collection of booleans, not one machine. |
| 13 | Voice agent calls `onTranscript`/assistant send | transcript → `assistantChat` | No request ID or cancellation | Two rapid turns can overlap. |
| 14 | HTTP route calls orchestrator | prompt → assistant context | HTTP returns 200 even for orchestrator-level failure objects | Error semantics are weak. |
| 15 | Context builder loads state/memory | prompt → history/memory context | Chat reads `item.text`, DB provides `content` | Conversation context is effectively empty. |
| 16 | Firebase memory may be queried | prompt → limited documents | Query ignored | Retrieval is not relevance-based. |
| 17 | Provider selected | context → Gemini or NVIDIA request | Defaults/model/key fields can conflict | No streaming or token-budget calculation. |
| 18 | Provider returns answer/tool calls | API response → normalized output | Gemini fallback can run on non-retryable errors | Potential duplicate request/cost. |
| 19 | Low-risk tool may run; higher risk stops | tool call → result/needs approval | No approval UI/API to continue | Agentic action loop is incomplete. |
| 20 | Optional second provider round | tool result → final text | At most one extra round; `maxAgentSteps` unused | Not a full bounded planning loop. |
| 21 | Memory save is attempted | result → local/Firebase store | Local save is called without `await` in key path | Response can contain undefined memory fields and unhandled rejection. |
| 22 | HTTP wraps result; client unwraps it | `{ok,data}` → `data` | Mounted UI still expects outer/old shape | **Core response rejected by frontend.** |
| 23 | On repaired path, visual answer is appended | answer → chat message | Main UI does not persist updated chat | Reload loses context/history. |
| 24 | Speech text processor cleans answer | visible text → spoken text | Frontend and backend both sanitize | Good separation, possible double transforms. |
| 25 | `/api/voice/tts` called | spoken text → synthesis request | Endpoint envelope differs from most routes | Contract inconsistency. |
| 26 | Provider resolver chooses Kokoro/fallback | config → provider | Kokoro script absent; voice preset can be overridden by stale explicit voice | Primary expected path unavailable. |
| 27 | Entire text is synthesized | text → complete audio buffer/base64 | No sentence streaming; first audio waits for full completion | High time-to-first-audio. |
| 28 | Browser creates object URL and plays Audio | base64 → sound | Stop cannot cancel server synthesis; manual stop may leak URL | Stale speech risk. |
| 29 | Orb/speaking booleans update | playback events → UI | Not driven by actual playback amplitude | Visual state can become inconsistent. |
| 30 | Playback ends; microphone may restart in some modes | ended → idle/listening | Backend recorder path does not have robust continuous loop; self-hearing risk | Needs explicit half/full-duplex policy and echo guard. |

### End-to-end root cause summary

Even before provider quality is considered, the spoken-answer path fails at step 22 because the response contract is wrong. After that is fixed, the next blockers are missing Kokoro runtime assets, uncancellable sequential STT/LLM/TTS, and broken history/memory persistence.

---

## 5. Critical Findings

### P0 findings

| ID | Finding | Evidence | Root cause | User impact | Effort / confidence | Required remediation and acceptance criteria |
|---|---|---|---|---|---|---|
| P0-01 | Live-looking secrets are shipped in `.env` | Root `.env` contains non-placeholder Gemini and Firebase values | Development secrets were included in distributable ZIP | Unauthorized API usage, Firebase access, cost/data exposure | S operational + M repository cleanup / High | Rotate Gemini and Firebase credentials; invalidate old Firebase service account/private key; remove `.env` from all archives/history; a secret scan of the repository and produced ZIP must return zero real credentials. |
| P0-02 | NVIDIA API credential is hardcoded in source | `backend/config/defaultConfig.cjs:18`; `backend/assistant/config/assistantConfig.cjs:45` | Credential used as a default literal | Anyone with source/archive can use it | XS + operational rotation / High | Revoke/rotate the key; defaults may contain only empty string or environment-variable name; build/grep/secret scan must find no provider key patterns. |

### P1 findings

| ID | Finding | Evidence | Root cause | User impact | Effort / confidence | Acceptance criteria |
|---|---|---|---|---|---|---|
| P1-01 | Assistant response contract is incompatible with mounted UI | `braceClient.ts:104-117,138-140`; `App.tsx:71-77` | Client migration unwrapped data but UI retained legacy wrapper/nested object assumptions | Text and voice requests appear to fail even with valid backend response | S / High | A typed contract test sends a prompt and the UI renders exactly one assistant message from `{success,message}`; no fallback “unknown structure” error. |
| P1-02 | Chat/history/state/settings/projects consumers use incompatible contracts | `App.tsx:25-30`; orphan app files; `ExecutiveBriefing.tsx` | No single source of API response types | History/settings/projects never load or show fake fallback data | M / High | Every API client method has a declared return type; contract tests cover all active screens; no active component checks a removed outer `ok` field. |
| P1-03 | Memory APIs and orchestrator misuse asynchronous methods | `memoryManager.cjs:32,51`; `server.cjs:298-301`; orchestrator save path | Missing `await` and promise-unaware wrappers | CRUD returns `{}`/wrong data; unhandled rejections; assistant memory fields undefined | S / High | All memory routes await operations; create/search/update/delete integration tests pass; test runner reports zero unhandled rejections. |
| P1-04 | Conversation schema and persistence are disconnected | `stateStore.cjs:53-55,95-101`; `assistantContextBuilder.cjs:107-110`; no `saveChat()` from main app | `content` versus `text` drift and no canonical turn transaction | Assistant forgets chat, UI history differs from model history | M / High | One `ChatMessage` schema is used end to end; saved UI history equals context supplied to provider; reload restores the last completed turns. |
| P1-05 | Kokoro primary TTS cannot start from archive | `kokoroProvider.cjs:15-23`; expected external script absent | Runtime asset is outside repository and not installed/configured | Desired voice silently fails or falls back | M / High | Startup health identifies a configured, existing Kokoro endpoint/script; one integration test synthesizes a short phrase; missing provider produces an explicit degraded state, not a false “ready”. |
| P1-06 | Faster-whisper starts a new process/model for every utterance | `voiceService.cjs:63-88` | Batch proof-of-concept used as production STT service | Very high latency, CPU/RAM spikes, process accumulation under overlap | L / High | One persistent worker loads model once; health and queue depth are visible; subsequent transcription avoids model cold-start; cancellation terminates the active job safely. |
| P1-07 | Provider fallback is not wired to runtime status | recorder/voice-agent selection versus `/api/voice/status` | Capability existence is mistaken for provider readiness | Local STT failure does not automatically use browser STT | M / High | When faster-whisper health is unavailable, supported browsers select Web Speech before recording; UI clearly states provider; no failed backend attempt is required. |
| P1-08 | No end-to-end cancellation or stale-response protection | main send, provider requests, voice TTS/player | No request generation ID and abort signal propagation | Old text/audio may arrive or play after a newer request | L / High | Starting/cancelling a request aborts STT/LLM/TTS where supported; stale responses are discarded by request ID; old audio can never play after a newer turn begins. |
| P1-09 | Agent approvals are terminal, not resumable | `assistantToolRegistry.cjs:33-38`; no approval route/UI | “Needs approval” response was implemented without approval state machine | Most useful file/app/coding tools cannot complete through the assistant | L / High | Approval request is persisted, shown to user, scoped to exact tool/input, expires, and can be approve/deny; execution occurs only after matching approval. |
| P1-10 | Tool permissions are not enforced for low-risk agent execution | `assistantToolRegistry.cjs:39-42`; registry `requiredPermission` | Risk level controls execution but permission flag is ignored | A disabled capability can still run if classified low risk | S / High | Every tool execution checks `requiredPermission`; denial is logged and returned; unit tests cover enabled/disabled state for every risk class. |
| P1-11 | Local APIs have no request authentication | `backend/server.cjs` origin/CORS logic and routes | Localhost binding is treated as sufficient trust | Any local process and some originless requests can call APIs, including app/task actions | M / High | Server requires an installation-scoped random bearer/session token for state-changing routes; originless unauthorized requests receive 401; token never appears in logs or frontend source bundle. |
| P1-12 | Uploaded dependency tree is not portable | bundled `node_modules`; startup/build errors | Native Windows binaries and optional bindings were archived | Project cannot build/start in another environment; users may run stale/vulnerable packages | S packaging / High | Distribution excludes `node_modules`; documented `npm ci` succeeds on target Windows; `npm run build`, `npm test`, and backend health pass from a clean install. |

---

## 6. Voice Input and STT Findings

### 6.1 Microphone and capture

**Confirmed strengths**

- The recorder requests echo cancellation, noise suppression, and automatic gain control.
- Media stream tracks and the AudioContext are generally closed during cleanup.
- Recording data is buffered through `MediaRecorder`, avoiding raw PCM transfer from the UI.
- Permission failures can be surfaced rather than silently ignored.

**Confirmed defects and risks**

| Severity | File/symbol | Problem | Root cause | User impact | Recommended fix |
|---|---|---|---|---|---|
| P1 | `src/voice/useAudioRecorder.ts` provider branch | Local STT is selected because the client method exists, not because faster-whisper is healthy | Capability check is static; health state is ignored | Voice fails on machines without local STT instead of falling back | Fetch/cache voice capabilities before activation and select provider deterministically. |
| P1 | `backend/voice/voiceService.cjs:63-88` | New Python process and `WhisperModel` per request | Batch script embedded in Node | Long delay and RAM/CPU spikes | Persistent Python worker or local STT server with model loaded once. |
| P1 | `voiceService.cjs:23` versus `server.cjs` body limit | STT accepts 20 MB, but JSON body limit is 2 MB and base64 adds overhead | Independent limits | Longer recordings fail before STT validation | Shared byte limits; binary/multipart upload; publish maximum duration. |
| P1 | HTTP timeout versus STT child timeout | Server can time out before child process | Timeouts not coordinated and abort signal unused | User sees failure while Python continues consuming resources | One deadline propagated into child process; kill and clean temp file on abort. |
| P2 | `useAudioRecorder.ts` timer/RAF handling | A `setTimeout` handle is cleaned with `cancelAnimationFrame` | One ref used for two scheduling APIs | Volume loop may survive cleanup and leak CPU/state callbacks | Separate timer and RAF refs; clear with matching APIs; add lifecycle test. |
| P2 | capture constraints | No selected input device, sample-rate/channel policy, or codec capability negotiation | Default-browser assumptions | Inconsistent quality and provider compatibility | Expose device selector; record actual mime type; resample/transcode server-side where required. |
| P2 | raw recording retention | When raw audio saving is enabled, retention and deletion controls are unclear | Debug option lacks data lifecycle | Sensitive voice recordings may remain in temp storage | Explicit opt-in, storage directory, retention duration, deletion UI, and log redaction. |
| P2 | stop state | UI can move to idle while recorder `onstop` is still transcribing | Recording and request states are conflated | Misleading UI; second request can overlap | Use `transcribing` state until transcript succeeds/fails/cancels. |

### 6.2 VAD

The backend `vadManager.cjs` is a small configuration object and is not in the actual audio path. The real detector in `useAudioRecorder.ts` calculates analyser energy and compares it with a fixed threshold. This is acceptable as a basic prototype but should not be called Silero VAD.

Missing capabilities:

- Adaptive noise-floor calibration.
- Hysteresis between speech-start and speech-stop thresholds.
- Pre-speech ring buffer, so initial consonants can be clipped.
- Minimum speech segment validation.
- Robust post-speech padding.
- Speaker-output suppression/full-duplex echo policy.
- Measured false-start and cut-off tests across fans, traffic, and Indian household noise.

**Recommended target:** run a lightweight VAD in an AudioWorklet/Web Worker or persistent local service. Keep a 250–400 ms pre-roll and 400–700 ms post-speech tail, calibrate the noise floor at activation, and expose a “push to talk” fallback.

### 6.3 STT provider design

A persistent STT service should expose:

```text
GET  /health
POST /transcribe        binary audio + language hint + request ID
POST /cancel/:requestId
SSE/WebSocket optional partial transcript events
```

Provider interface:

```ts
interface SttProvider {
  health(): Promise<ProviderHealth>;
  transcribe(input: AudioInput, signal: AbortSignal): Promise<TranscriptResult>;
  supportsStreaming: boolean;
}
```

Acceptance targets:

- Model loads once per backend session.
- Only one active recording per UI session.
- Microphone tracks close within one second of cancel.
- Empty/no-speech audio does not create an LLM request.
- Provider unavailability is known before recording begins.
- A failed local STT path falls back once, not in an infinite retry loop.
- Transcript language and confidence/provider metadata are retained for diagnostics.

---

## 7. LLM, Agent, and Tool Findings

### 7.1 Provider and prompt layer

| Severity | Finding | Evidence | Risk | Recommendation |
|---|---|---|---|---|
| P1 | Provider default is NVIDIA while tests/UI assumptions refer to Gemini | default config, assistant config, failing test, UI label | Unpredictable active model and setup instructions | Make `AI_PROVIDER` mandatory or use one documented default; status UI must display the actual provider/model. |
| P1 | One generic `apiKey` field can be used for both providers | `assistantConfig.cjs` | Wrong credential routed to provider; accidental storage/exposure | Separate `geminiApiKeyRef` and `nvidiaApiKeyRef`; never persist raw values in generic settings. |
| P1 | Model resolution does not first branch by selected provider | `assistantConfig.cjs:48-50` | Gemini model can be sent to NVIDIA or vice versa | Resolve provider, then provider-specific model. Validate at startup. |
| P2 | No streaming response | provider implementations and route | High perceived latency and no incremental speech | Stream model deltas to backend event channel; sentence assembler feeds TTS. |
| P2 | Fixed history counts, no token budget | context builder | Context can overflow or waste tokens; no explainable truncation | Token-aware budget with system/memory/history/tool partitions and summary fallback. |
| P2 | Gemini model fallback is too broad | provider error path | Non-retryable errors may duplicate request/cost | Retry only classified transient/rate-limit/model-unavailable errors. |
| P2 | Orchestrator failure returned inside HTTP 200 | `/api/assistant/chat` and orchestrator | UI cannot reliably distinguish transport, provider, or task failure | Stable error model with appropriate 4xx/5xx plus safe machine code. |
| P2 | Memory/tool content is not strongly delimited as untrusted | prompt construction | Prompt injection through retrieved data or tool output | Structured role/content blocks and explicit instruction hierarchy; sanitize tool display separately from model input. |

### 7.2 Agent loop

The current orchestrator is a single model call plus, at most, one follow-up call after tool use. The configured `maxAgentSteps` is not an enforced loop. This is safer than an unbounded loop, but it means multi-step work is not truly supported.

Recommended bounded loop:

1. Create request record and deadline.
2. Build context once, with token budget.
3. Ask provider for text or tool calls.
4. Validate tool call against registry schema and permission.
5. For approval-required calls, persist exact request and suspend.
6. Execute approved tool with timeout and cancellation.
7. Append structured tool result.
8. Repeat up to configured maximum, with duplicate-call detection.
9. Produce final answer and transactional persistence.

Mandatory protections:

- Maximum steps and maximum tool calls.
- Duplicate tool-call hash detection.
- Per-tool timeout and global request deadline.
- Cancellation checked before and after each operation.
- User approval for destructive/high-impact calls.
- No recursive subagent delegation without a depth limit.
- Structured progress events tied to request ID.

### 7.3 Tool inventory

| Tool | Registration | Current status | Security/functional issue | Recommendation |
|---|---|---|---|---|
| `file.readFile` | `backend/tools/toolRegistry.cjs` | Approval-blocked | Tool implementation is not consistently protected by the API path guard | Enforce approved roots inside the tool itself, not only in one route. |
| `file.writeFile` | same | Approval-blocked | High-impact; no resumable approval flow | Exact diff/path approval, backup, atomic write, post-write hash. |
| `file.createFolder` | same | Approval-blocked | No approval continuation | Root policy and idempotent result. |
| `file.searchFiles` | same | Approval-blocked | Potential broad filesystem traversal | Approved root, file/depth/result limits, cancellation. |
| `file.extractText` | same | Approval-blocked | Parser cost and untrusted content | Size/type limits; sandbox parser; mark output untrusted. |
| `file.deleteToRecycleBin` | same | Approval-blocked | Destructive | Exact path confirmation and recycle-bin verification. |
| `folder.organize.preview` | same | Approval-blocked | Preview cannot become approved execution through agent | Persist immutable plan ID and show every move. |
| `folder.organize.execute` | same | Approval-blocked | High-impact bulk changes | Approve plan hash, backup/rollback log. |
| `command.explain` | same | Executable as low risk | Required `shell` permission is not checked in agent runner | Enforce permission even for dry-run/low-risk tools. |
| `command.run` | same | Approval-blocked | Command policy is deny-pattern oriented | Executable allowlist/profile, cwd root, environment allowlist, timeout/output limit, exact approval. |
| `app.openVSCode` | same | Approval-blocked | No continuation | Validate existing folder and executable availability. |
| `app.openFolder` | same | Approval-blocked | No continuation | Validate selected root; platform adapter. |
| `app.openURL` | same | Approval-blocked | URL policy must resist dangerous schemes/local SSRF | Allow `https/http` only by default; user-visible host confirmation. |
| `system.info` | same | Executable as low risk | Permission ignored by agent runner | Enforce `systemInfo`; redact identifiers. |
| `coding.scanProject` | same | Approval-blocked | Broad filesystem access | Approved project root and bounded scan. |
| `coding.proposeEdit` | same | Approval-blocked | Useful preview cannot progress | Persist proposed diff and approval ID. |
| `coding.applyEdit` | same | Approval-blocked | Destructive edit | Apply only approved diff hash; backup; tests; rollback. |
| `browser.status` | same | Executable as low risk | Permission ignored | Enforce permission; status only, no hidden automation. |
| `mcp.status` | same | Executable as low risk | Config content may contain secrets | Redact all credentials/headers; enforce permission. |
| `agent.read_skill` | same | Executable as low risk | `files` permission ignored; skill name validation needed | Allow only indexed skills under fixed root; no path separators. |

### 7.4 Tool contract defects

Most tools have empty input/output schemas. The LLM therefore has little machine-verifiable guidance, and the backend cannot reject malformed calls consistently. Add JSON Schema/Ajv or an equivalent validator at the registry boundary. The schema, implementation, approval display, and audit log must all use the same normalized input object.

---

## 8. Memory Findings

### 8.1 Confirmed problems

1. `memoryManager` CRUD/search methods are asynchronous, but server routes and other callers return/capture them without `await`.
2. The local state store reads chat messages as `{role, content}`, while the context builder maps `item.text`.
3. The state-store writer expects `msg.content`; frontend messages primarily use `text`.
4. The main mounted app loads history but does not call `saveChat()` after turns.
5. The orchestrator saves to memory/Firebase through a path that does not guarantee a completed local chat transaction.
6. Firebase search ignores the text query and returns a limited collection slice.
7. There is no explicit user/account ownership on local or Firebase records.
8. Settings and secret-like values can be stored in the same plaintext SQLite key/value store.
9. There is no clear correction/deletion propagation across local DB, Firebase, and Obsidian.
10. Long-term memory uses lexical matching/stubs rather than a robust relevance + recency design.

### 8.2 Required target memory model

| Layer | Purpose | Data | Retention/control |
|---|---|---|---|
| Working state | Active request only | request ID, state, partial transcript, tool progress | Deleted when request completes/cancels. |
| Conversation turns | Exact user/assistant exchange | canonical message objects with timestamps/status | User can list/delete; failed partial answers marked, not treated as final. |
| Conversation summary | Token-efficient continuity | summary with source turn range/version | Regenerated transactionally; never replaces original until successful. |
| Long-term facts | Durable user-approved facts/preferences | fact, source, confidence, created/updated timestamps | User can inspect, correct, delete; avoid automatic sensitive facts. |
| Task state | Agent job progress | goal, steps, approvals, tool results | Explicit status and expiration. |
| Tool audit | Accountability | tool, normalized input hash, approval, result, duration | Retained locally with redaction; deletion policy documented. |
| Knowledge documents | Obsidian/project content | chunk references and metadata | Source path and modified time; no silent copy of secrets. |

### 8.3 Canonical message schema

```ts
interface ConversationMessage {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "tool" | "system";
  content: string;
  status: "pending" | "complete" | "failed" | "cancelled";
  createdAt: string;
  requestId?: string;
  toolCallId?: string;
  metadata?: Record<string, unknown>;
}
```

Use `content` everywhere. Convert legacy `text` once at the boundary/migration. Do not maintain both indefinitely.

### 8.4 Acceptance criteria

- A completed turn is saved once, in order, with a stable ID.
- The history visible after reload exactly matches the history used for the next model request.
- Failed/cancelled assistant outputs are not injected as successful prior answers.
- Memory CRUD routes return resolved data, never `{}` caused by Promise serialization.
- Search results include source, score, and timestamp and are query-dependent.
- Deleting a conversation or fact removes or tombstones it in every enabled backend.
- Secrets are never written into the memory/fact store automatically.

---

## 9. TTS and Playback Findings

### 9.1 Text preparation

The project correctly preserves the rich visible response while generating a separate spoken version. The speech processors remove or transform Markdown markers, code blocks, URLs, raw formatting, and punctuation patterns. Ten speech-processor tests pass, making this one of the healthiest subsystems.

Improvements still required:

- Choose one canonical cleanup layer. Frontend and backend currently both sanitize, which can over-transform text.
- Add tests for Hinglish, Indian names, lakh/crore/currency, dates, abbreviations, file paths, citations, code, and emoji.
- Explicitly skip or summarize large code blocks/tables instead of attempting to pronounce them.
- Preserve sentence boundaries for chunking and natural pauses.

### 9.2 TTS provider findings

| Severity | File/symbol | Finding | Impact | Fix |
|---|---|---|---|---|
| P1 | `backend/voice/kokoroProvider.cjs:15-23` | Kokoro server script expected outside repo and missing from artifact | Primary desired voice is unavailable | Explicit external service URL or managed installer; verify path at startup. |
| P1 | TTS request lifecycle | No abort propagation into provider synthesis | Stale expensive work continues and can later play | Abortable provider interface and request ID guard. |
| P2 | full-response synthesis | Entire LLM answer and TTS complete before playback | Slow first audio and unnatural pauses | Sentence-aware streaming/chunk queue; synthesize first sentence immediately. |
| P2 | `VoiceSettings.tsx` vs `useVoiceAgent.ts`/resolver | Selected preset can be overridden by persistent explicit `kokoroVoice` | UI voice selection may not change actual voice | Provider-specific normalized voice setting; preview after save. |
| P2 | pitch/emotion controls | Not applied consistently to Kokoro/Edge | UI implies controls with no audible effect | Expose only supported controls per active provider. |
| P2 | fallback reporting | Browser speech may succeed while UI shows backend failure | Confusing degraded operation | Return `{provider, degraded, warnings}` and display successful fallback clearly. |
| P2 | provider health polling | Dependency probes spawn processes/import modules and can block | Periodic status latency/CPU spikes | Background cached async health monitor with longer TTL and event updates. |

### 9.3 Playback findings

**Working:** normal playback uses an HTML `Audio` element; normal `ended`/`error` paths revoke object URLs; browser speech can be cancelled.

**Broken/incomplete:** no chunk queue, pause/resume, selected output device, or real amplitude signal; stopping does not cancel backend synthesis; manual replacement may skip URL revocation; there is no generation ID to reject stale audio; listening can restart in ways that allow the assistant to hear itself.

### 9.4 Target playback policy

- Every user turn has a monotonically increasing `requestId`/generation.
- Audio chunks carry request ID and sequence number.
- Player accepts only the active request and ordered sequence.
- New user speech immediately aborts current player and marks queued chunks stale.
- TTS workers receive abort signals; if provider cannot abort, returned audio is discarded.
- Microphone state is explicitly half-duplex by default; optional full-duplex requires echo cancellation and self-speech suppression.
- First spoken chunk target: begin after the first complete sentence rather than after the entire answer.

---

## 10. Backend Findings

### 10.1 API route inventory

| Method/event | Path | Handler area | Active frontend caller | Auth | Validation/status |
|---|---|---|---|---|---|
| GET | `/health` | server | health script/manual | None | Basic health only. |
| GET | `/api/events` | server SSE | No confirmed active consumer | None | No heartbeat/event IDs; effectively disconnected. |
| GET | `/api/status` | backend status | status UI | None | Heavy nested status; contract not formalized. |
| GET | `/api/state` | state store | settings/briefing | None | Client unwrap mismatch in consumers. |
| GET/POST | `/api/settings` | state store | settings | None | No schema; raw settings can include secret-like data. |
| POST | `/api/settings/secret` | settings | settings | None | Writes secret into local settings; no keychain. |
| POST | `/api/permissions` | state store | settings | None | Name/enabled validation minimal. |
| GET/DELETE | `/api/logs` | logger | diagnostics | None | Redaction exists; no pagination/retention contract. |
| GET/POST/DELETE | `/api/chat` | state store | history client | None | Message schema mismatch; main UI does not save. |
| POST | `/api/ai/test` | provider | setup UI | None | May consume provider request; error contract inconsistent. |
| POST | `/api/assistant/chat` | orchestrator | main UI/voice | None | Core response mismatch; no cancellation/streaming. |
| GET | `/api/assistant/status` | status | main UI poll | None | Synchronous dependency probes can be costly. |
| GET/POST | `/api/greeting/startup` | greeting | voice agent | None | Sends direct object rather than standard envelope. |
| GET/POST | `/api/voice/config` | voice config | voice UI | None | No formal schema/version migration. |
| GET | `/api/voice/status` | voice status | voice agent | None | Health is not used to choose STT path reliably. |
| GET | `/api/voice/voices` | provider list | voice settings | None | Voice ID/preset resolution inconsistent. |
| POST | `/api/voice/transcribe` | voice service | recorder | None | Base64 JSON, conflicting size/time limits, no cancel. |
| POST | `/api/voice/tts` | voice service | voice agent | None | Direct response shape differs from most routes. |
| POST | `/api/voice/log` | logger | voice agent | None | Validate event names/payload size. |
| GET | `/api/system` | system tool | diagnostics | None | Permission behavior inconsistent with direct route. |
| POST | `/api/files/analyze` | file analyzer | attachment flow | None | Uses path guard; attachment UI is not wired. |
| POST | `/api/files/select` | native selection | client bridge path | None | Platform-specific behavior; browser limitations. |
| GET/POST | `/api/tasks` | state/tasks | task UI | None | Schema not formalized. |
| POST | `/api/tasks/run` | legacy execution | potential task UI | None | State-changing local action without request auth. |
| GET/POST/DELETE | `/api/apps*` | app manager | app UI | None | Launch action is sensitive; no request auth. |
| GET | `/api/tools` | registry | diagnostics/agent UI | None | Useful inventory. |
| POST | `/api/tools/dry-run` | tool registry | possible UI | None | Permission/schema enforcement incomplete. |
| POST | `/api/tools/run` | blocked route | client | None | Intentionally blocked; good default. |
| GET/POST/PUT/DELETE | `/api/memory*` | memory manager | memory UI/client | None | Async route bug; no ownership. |
| GET/POST/PUT/DELETE | `/api/notes*` | notes/Obsidian | note client | None | Must validate roots and IDs consistently. |
| GET/POST | `/api/projects*` | project manager | explorer client | None | Client contract mismatch; path policy needed. |

### 10.2 Architecture and reliability

- `backend/server.cjs` owns CORS, parsing, routing, SSE, static files, browser launch, and lifecycle. Split into middleware-like helpers/routers without changing runtime.
- Environment variables for host/port/body limit/origins are read before `createBackend()` loads `.env`; `.env` may not configure the server as intended unless the process environment is already populated.
- Default data path is Windows-specific (`AppData/Roaming`) even on non-Windows systems.
- `repoRoot = path.resolve(__dirname, "..", "..")` resolves one level above the project. This breaks bundled-resource discovery and creates unsafe path assumptions.
- Request timeout creates an `AbortController`, but downstream provider/tool handlers do not consume `req.abortSignal`; timeout does not cancel work.
- SSE has no heartbeat, `Last-Event-ID`, typed payloads, or active event production.
- Error responses do not use one structured model; some handlers return failed objects with HTTP 200.
- Static-file traversal validation should use `path.relative` boundary checks rather than a raw string-prefix comparison.
- Graceful shutdown should close HTTP/SSE clients, DB, workers, and child processes in an ordered deadline.

### 10.3 Configuration target

Use a validated startup schema, for example:

```text
server.host, server.port, server.allowedOrigins
storage.dataDir, storage.vaultDir
providers.ai.selected, providers.ai.gemini.model, providers.ai.nvidia.model
providers.stt.selected, providers.stt.endpoint/model
providers.tts.selected, providers.tts.kokoro.endpoint
security.localAuthTokenRef
limits.bodyBytes, audioBytes, requestTimeoutMs, toolTimeoutMs
```

Secrets should resolve through environment/OS credential storage and never be returned by `/api/state` or saved in general settings.

---

## 11. Frontend Findings

### 11.1 Component and state architecture

- `src/App.tsx` mixes boot, history, status polling, chat, agent requests, voice orchestration, diagnostics, and presentation.
- `src/components/Interface.tsx` is a large mixed UI file rather than a cohesive component module.
- Several old app components are not imported by the mounted application, but still contain stale API assumptions and mock behavior.
- Voice state is scattered across `loading`, `orbState`, recorder state, `speechSynthesis`, and audio refs. Impossible combinations are not prevented.
- A text request triggers speech asynchronously without waiting or request ownership. Rapid user actions can overlap.
- No Error Boundary protects the primary shell.
- There is no explicit offline/reconnecting/cancelled state.
- The attachment button is visible without a working callback.
- The secondary Assistant app has a no-op voice button.
- Executive briefing inserts a synthetic “all completed” style message when real data is absent.
- Hardcoded “Good evening, Yash” is not time-aware and bypasses the greeting/memory system.
- `hasGeminiKey={true}` can claim setup success regardless of actual configuration.
- Workspace panels contain mock/hardcoded activity and can mislead users into believing operations ran.

### 11.2 Required voice state machine

```text
BOOTING
  ├─> IDLE
  ├─> OFFLINE
  └─> ERROR

IDLE -> REQUESTING_MIC -> LISTENING -> ENDING_SPEECH -> TRANSCRIBING
TRANSCRIBING -> THINKING -> WAITING_APPROVAL | USING_TOOL | FORMING_REPLY
FORMING_REPLY -> SYNTHESIZING -> SPEAKING -> IDLE

Any active state -> CANCELLING -> IDLE
Network loss -> RECONNECTING -> previous-safe-state or ERROR
```

One reducer/state-machine event should own transitions. Derived UI flags such as `isListening` and `isSpeaking` should come from the state, not be independently mutable.

### 11.3 UX and accessibility priorities

- Show exact provider/status: microphone, STT, AI, tool, memory, TTS.
- Provide a single prominent cancel/interrupt control during every active phase.
- Explain permission denial with a browser-specific recovery action.
- Do not present fake success text or mock task progress in production mode.
- Disable unavailable controls and explain why.
- Add keyboard shortcut and visible focus for microphone/send/cancel.
- Add `aria-live` regions for transcript/status and accessible labels for icon-only buttons.
- Respect reduced-motion and cap orb/canvas work when tab is hidden.
- Use real microphone/playback amplitude only when available; otherwise use a clearly decorative state animation.

---

## 12. Frontend–Backend Wiring Matrix

| Frontend feature | Frontend file/symbol | Backend endpoint/event | Backend handler | Data contract status | Result/issue |
|---|---|---|---|---|---|
| Load chat | `App.tsx` startup effect | GET `/api/chat` | `chatList` | Broken consumer expects wrapper | History ignored. |
| Send text | `App.tsx` send handler | POST `/api/assistant/chat` | orchestrator | Broken consumer expects `ok` and `message.text` | Main assistant answer rejected. |
| Speak text answer | `useVoiceAgent.ts` | POST `/api/voice/tts` | voice service | Endpoint differs from normal envelope; no request ID | Only works after chat contract repair; stale audio possible. |
| Start voice capture | voice controls/hook | Browser API | None | Local state only | Basic capture; no health-gated provider choice. |
| Transcribe recording | `useAudioRecorder.ts` | POST `/api/voice/transcribe` | `voiceTranscribe` | Payload works in principle; size/deadline mismatch | Runtime-dependent and slow. |
| Browser STT | recorder hook | Browser Web Speech | None | Separate path | Not automatically selected from backend health. |
| Stop listening | voice hook | Local recorder stop | None | No active request contract | Does not cancel STT/LLM/TTS. |
| Cancel/stop agent | `braceClient.stopAgent` | POST `/api/tools` | No matching route | Nonexistent endpoint | Always fails. |
| Startup greeting | voice agent | GET/POST `/api/greeting/startup` | greeting service | Direct response, not standard client envelope | Fragile; history fields also mismatched. |
| Load assistant status | `App.tsx` polling | GET `/api/assistant/status` | status handler | Partially compatible | Can incur heavy dependency checks. |
| Load voice status | voice hook/UI | GET `/api/voice/status` | voice status | Data available but not authoritative in routing | UI/provider can disagree. |
| Load voice config | voice hook/settings | GET `/api/voice/config` | config handler | Mostly unwrapped data | Preset/explicit voice conflict. |
| Save voice config | voice settings | POST `/api/voice/config` | config update | Weak validation | UI may claim a voice that resolver does not use. |
| List voices | voice settings | GET `/api/voice/voices` | voice service | Requires runtime providers | Needs health and provider labeling. |
| Load state/settings | `SettingsApp.tsx`, briefing | GET `/api/state` | state handler | Broken wrapper expectation | Loading/fallback forever. |
| Save settings | settings UI | POST `/api/settings` | state store | Optimistic/mock-like update | No rollback/validation; screen likely orphaned. |
| Save secret | client/settings | POST `/api/settings/secret` | saveSecret | Functionally dangerous | Secret stored in plaintext general settings. |
| Change permission | settings | POST `/api/permissions` | updatePermission | Backend stores value | Agent low-risk execution ignores it. |
| Load system info | system monitor/briefing | GET `/api/system` | system tool | Handler nests inner `info`, so some callers happen to work | Inconsistent contract. |
| Attach/analyze file | chat button/client | POST `/api/files/select`, `/api/files/analyze` | file handlers | UI callback missing | Visible dead button. |
| List projects | `ExplorerApp.tsx` | GET `/api/projects` | project manager | Broken wrapper expectation | Empty project view. |
| Scan project | client | POST `/api/projects/scan` | project manager | No active screen confirmed | Needs allowed-root policy. |
| List tools | client/agent page concept | GET `/api/tools` | registry | Works in principle | No complete approval UI. |
| Dry-run tool | client | POST `/api/tools/dry-run` | registry | Incomplete schemas/permissions | Useful but not sufficient for execution. |
| Execute tool | client | POST `/api/tools/run` | explicitly blocked | Intentionally blocked | Safe default; no approved replacement. |
| Agent-requested low-risk tool | provider/orchestrator | internal registry call | assistant tool runner | Executes without checking required permission | Security/expectation bug. |
| Agent-requested higher-risk tool | provider/orchestrator | internal registry call | assistant tool runner | Returns `needsApproval` | No resume path; task stops. |
| Memory list | potential client | GET `/api/memory` | manager | Synchronous list likely works | No ownership/pagination. |
| Memory search/save/update/delete | client | `/api/memory*` | async manager | Backend fails to await | Broken responses/unhandled errors. |
| Notes CRUD | client | `/api/notes*` | note manager | Requires runtime vault | Hardcoded/non-portable path. |
| Task list/save | client/workspace | GET/POST `/api/tasks` | state store | Requires active UI verification | No schema/versioning. |
| Run task | task UI/client | POST `/api/tasks/run` | legacy executor | Callable without local auth | Security risk if permission enabled. |
| Apps list/add/delete | app UI/client | `/api/apps*` | app manager | Requires active UI verification | Platform paths and validation. |
| Launch app | client | POST `/api/apps/launch` | launcher | No local request auth | Sensitive action. |
| Realtime progress | potential UI | GET `/api/events` | SSE | No meaningful emit/consume path | Disconnected. |
| Reconnect backend | UI polling only | health/status | server | No explicit reconnect protocol | User can see stale/ambiguous state. |

---

## 13. Security and Privacy Findings

| Severity | Finding | Evidence/area | Safe remediation |
|---|---|---|---|
| Critical | Populated `.env` distributed | Root archive | Rotate credentials, purge history/artifacts, distribute `.env.example` only. |
| Critical | Hardcoded NVIDIA key | Two config modules | Revoke, remove literal, secret scan in CI. |
| High | Local state-changing APIs have no request authentication | settings, tasks, apps, files, memory routes | Installation-scoped token, SameSite session/authorization header, deny unauthorized originless requests. |
| High | Firebase records lack explicit user scope/authorization model | Firebase memory | Bind all documents to installation/user ID and enforce security rules/service ownership. |
| High | Secrets can be stored in plaintext SQLite settings | `saveSecret`/state store | Use OS credential manager or encrypted secret store; return only presence metadata. |
| High | Tool permission field is not always enforced | assistant tool runner | Mandatory centralized permission check before every execution/dry run. |
| High if approvals are added | File tools do not all enforce path guard internally | registry tool implementations | Enforce canonical approved roots at tool boundary; reject symlink escapes. |
| Medium | CORS accepts no-Origin requests | `isOriginAllowed` | Require local auth independently of Origin; only allow no-Origin for authenticated CLI/health use. |
| Medium | Static file boundary uses string-prefix check | server static handler | Use resolved path + `path.relative`; reject absolute/`..`/symlink escape. |
| Medium | Base64 audio and context can consume memory | server/voice | Binary streaming, strict request/duration limits, concurrency cap. |
| Medium | Prompt/tool injection defenses are weak | context/tool result formatting | Treat memory/doc/tool text as untrusted data with structured boundaries and tool policy. |
| Medium | Voice recording retention lacks user control | raw-audio option | Opt-in, visible indicator, retention expiry, delete command. |
| Medium | Logs/status may reveal paths/configuration | logger/status | Redact usernames, tokens, private paths; development diagnostics opt-in. |
| Medium | Vulnerable dependencies reported by `npm audit` | dependency tree | Upgrade deliberately, especially Firebase/Google transitive stack; retest. |
| Low | Mock/fake success text can mislead | briefing/workspaces | Never claim completed actions without a backend event/result. |

### Dependency audit result

`npm audit --omit=dev --json` reported **10 vulnerabilities: one high and nine moderate** in the uploaded dependency graph. The high item is transitive through `form-data`; moderate items are in the Firebase/Google/protobuf/UUID dependency chain. Do not run a blind force-fix. Upgrade direct dependencies to supported versions, regenerate the lockfile through a clean install, and run unit/integration tests.

### Secret-handling acceptance criteria

- Production/distribution ZIP contains `.env.example`, never `.env`.
- No API key/private key/token pattern appears in source, build assets, source maps, logs, tests, or docs.
- UI receives only `configured: true/false` and provider metadata, never the secret value.
- Rotated credentials are tested, and old credentials are verified revoked.

---

## 14. Performance Findings

### 14.1 Current latency chain

```text
Mic permission/start
→ silence-based end detection
→ whole recording encoded to base64
→ JSON upload
→ Python process startup
→ faster-whisper import + model load
→ full transcription
→ full context/memory retrieval
→ full non-streaming LLM response
→ full text cleanup
→ Kokoro startup/fallback selection
→ full TTS synthesis
→ base64 response + browser decode
→ playback
```

The architecture serializes almost every expensive operation. The largest avoidable bottlenecks are per-turn Whisper startup/model load, full-response LLM, full-response TTS, base64 audio, synchronous provider health probes, and lack of request cancellation.

| Bottleneck | Impact | Risk of fix | Recommended improvement | Expected effect |
|---|---|---|---|---|
| Per-turn Whisper process/model | Extreme STT cold latency and RAM | Medium/High | Persistent worker/service | Removes repeated model load; largest voice improvement. |
| Full LLM response | No early UI/speech feedback | Medium | Streaming provider adapter | Earlier visible tokens and sentence production. |
| Full TTS response | Slow first audio | Medium | Sentence chunk queue/streaming | First audio after first sentence rather than whole answer. |
| Base64 audio JSON | ~33% size overhead and large memory copies | Medium | Binary multipart/stream | Lower transfer and memory pressure. |
| Fixed status polling/probes | Periodic CPU/process spikes | Low/Medium | Background health cache + events | Smooth UI and fewer process spawns. |
| Broken history/context | Wasted calls and low answer quality | Low/Medium | Canonical schema and token budget | Better continuity without unbounded prompts. |
| Large copied skill tree | Startup/index/distribution overhead | Low | Manifest/package-on-demand | Smaller archive and review surface. |
| Heavy UI components/animations | Re-render/GPU cost | Low/Medium | Split components; pause hidden/reduced-motion | Lower idle CPU and better low-end hardware behavior. |
| No cancellation | Wasted provider/CPU work | Medium/High | Abort signal propagation | Prevents overlapping jobs and stale output. |

### 14.2 Suggested service-level targets

These are practical targets after stabilization, not claims about the current build:

- UI interactive and backend health visible within 2 seconds after local startup on the intended PC.
- Microphone ready within 500 ms after permission has already been granted.
- End-of-speech decision within 500–800 ms after the user stops.
- Warm local STT result for a short utterance within 1–2.5 seconds depending on model/hardware.
- First LLM text delta within provider-appropriate limits, displayed immediately.
- First spoken audio begins after the first complete sentence, without waiting for the full answer.
- Cancelling a turn updates UI immediately and prevents all stale text/audio from being rendered.

---

## 15. Testing Gaps

### 15.1 Validation actually run

| Command/check | Result | Interpretation |
|---|---|---|
| `npm test` | Failed: 20 passed, 5 failed | Real regressions/config drift in provider defaults, context, missing-key path, path guard expectation, and memory manager; unhandled async rejections also occurred. |
| `node node_modules/typescript/bin/tsc --noEmit` | Passed | Frontend TypeScript is syntactically/type-valid under current declarations, but `unknown`/`any` hide API contract bugs. |
| `npm run build` | Failed with `vite: Permission denied` | Bundled dependency executable permissions are not portable. |
| Direct Vite build through Node | Failed: missing Rolldown native Linux binding | Uploaded `node_modules` was installed for another platform/optional dependency set. |
| Backend startup with isolated data | Failed: `better-sqlite3` invalid ELF header | Native module in archive targets another OS. Clean install required. |
| `npm audit --omit=dev` | 1 high, 9 moderate | Dependency remediation needed. |
| Secret scan | Found populated `.env` and hardcoded provider credential | Immediate rotation/removal required. |

Provider calls were intentionally not executed because the archive contains exposed credentials. Microphone/audio playback could not be meaningfully tested in the headless audit environment.

### 15.2 Missing unit tests

- API response parsing for every client method.
- Canonical message conversion and persistence.
- Voice finite-state transitions and impossible-state prevention.
- Recorder cleanup, timers, and one-active-session invariant.
- VAD threshold/calibration behavior using recorded fixtures.
- STT provider health/fallback selection.
- Abort and stale-request handling.
- Provider-specific model/key resolution.
- Tool JSON schemas and permission enforcement.
- Approval request hashing/expiry.
- Memory CRUD with awaited results and failure rollback.
- Token-budget truncation.
- TTS voice resolution, sentence chunking, queue ordering, stale audio rejection.
- Path guard including symlink/prefix/case behavior on Windows.

### 15.3 Required integration tests

1. HTTP client against a real test server for all response envelopes.
2. Chat turn persists and is present in the next provider context.
3. Memory create/search/update/delete returns resolved objects.
4. Faster-whisper worker mock loads once and handles multiple requests.
5. Provider unavailable → correct fallback selected before capture/synthesis.
6. Medium/high tool call creates approval record; approve executes exactly once; deny never executes.
7. Disabled permission blocks low, medium, and high tools.
8. New request cancels/discards prior LLM and TTS.
9. SSE/realtime reconnect, if retained.
10. Secret/status endpoint never serializes secret values.

### 15.4 End-to-end tests

Use Playwright with fake media devices and provider mocks:

- Speak a phrase and receive visible plus spoken answer.
- Deny microphone permission and recover.
- No microphone available.
- Silence/no-speech recording does not send prompt.
- Interrupt speech with a new command.
- Backend restarts during a turn and UI shows reconnecting.
- STT, LLM, tool, memory, and TTS failures each produce distinct actionable UI.
- Reload restores completed chat only.
- Two rapid requests never interleave or play stale audio.
- Voice setting preview matches saved/active provider voice.

Every confirmed P0/P1 defect in this report should become a regression test before it is closed.

---

## 16. Dead Code and Cleanup

| Item | File(s) | Current purpose | Status | Recommendation | Migration risk |
|---|---|---|---|---|---|
| Orphan assistant screen | `src/apps/AssistantApp.tsx` | Older assistant UI | Unmounted and contract-broken | Archive/delete after confirming no route imports; keep useful UI fragments only | Low |
| Orphan settings screen | `src/apps/SettingsApp.tsx` | Settings UI | Unmounted, response-broken, optimistic/mock behavior | Rebuild against typed settings service or remove | Low/Medium |
| Orphan explorer screen | `src/apps/ExplorerApp.tsx` | Project explorer | Unmounted and response-broken | Merge into active workspace after contract repair or remove | Low |
| Orphan monitor app | `src/apps/SystemMonitorApp.tsx` | System information | No confirmed mount | Decide active diagnostics path | Low |
| Old voice controls/orb/settings | `src/voice/VoiceControls.tsx`, `VoiceOrb.tsx`, `VoiceSettings.tsx` | Alternate voice UI | Some not imported in mounted app | Retain only components selected for target UI; remove duplicate state paths | Medium |
| Backend VAD manager | `backend/voice/vadManager.cjs` | Configuration/status | Not in real audio path | Rename to config or integrate actual detector; do not claim Silero | Low |
| Backend audio queue | `backend/voice/audioQueue.cjs` | Queue concept/stub | Not used for streamed playback | Replace with real request-scoped queue or remove | Low |
| Piper/Whisper provider stubs/duplicates | backend voice modules | Alternate providers | Some overlap with `voiceService.cjs` | Consolidate behind interfaces; archive unused prototypes | Medium |
| SSE channel | `/api/events`, `sendEvent` | Intended realtime updates | Disconnected | Implement typed broker or remove endpoint/client assumptions | Medium |
| `stopAgent` client method | `braceClient.ts:166` | Cancel agent | Calls nonexistent route | Replace with `/api/requests/:id/cancel` | Low |
| Mock workspace data | `src/os/workspaces/*` | Futuristic dashboard | Mostly static/decorative | Clearly mark demo mode or connect real task/project data | Low/Medium |
| Fake briefing fallback | `ExecutiveBriefing.tsx` | Status summary | Claims success without evidence | Remove immediately | XS |
| Hardcoded personal labels/paths | `App.tsx`, config, client hints, response prompt | Convenience defaults | Non-portable and misleading | Move to user profile/config migration | Low |
| Bundled `node_modules` | root | Dependencies | 320 MB, platform-specific | Never distribute; install from lockfile | Low |
| Bundled `dist` in source ZIP | root | Built frontend | Generated/stale risk | Build in release pipeline; include only in runtime release, not source package | Low |
| Copied skill corpus | `backend/assistant/skills` | Agent guidance | Hundreds of files; uncertain active coverage | Create manifest, package selected skills separately, load on demand | Medium |
| Prior audit/report duplicates | root and `docs/` | Documentation | Duplicated/stale | Retain one dated source of truth and archive old reports | Low |

Do not delete any uncertain item until imports, runtime route registration, and intended product scope are confirmed. Removal should happen after contract tests are in place.

---

## 17. Prioritized Remediation Roadmap

### Phase A — Stabilize Core System

| Priority | Task | Files | Reason | Effort | Risk | Dependency | Acceptance criteria |
|---|---|---|---|---|---|---|---|
| P0 | Rotate/purge all exposed secrets | `.env`; two config modules; repository/releases | Active credential exposure | S + operational | Low implementation, high urgency | Provider consoles/access | Old credentials revoked; source/archive scan clean; `.env` excluded. |
| P1 | Create shared API schemas/types and one envelope policy | `backend/server.cjs`; new shared contracts; `braceClient.ts`; active screens | Core UI rejects valid data | M | Medium | None | Contract tests pass for every active route; no `any`-based response parsing in core path. |
| P1 | Repair assistant/chat/state/settings/project consumers | `App.tsx`; active settings/status/workspace components | Restore visible functionality | M | Medium | Shared contracts | Text prompt renders; history/state load; no fake fallback. |
| P1 | Canonicalize chat messages and persist turns | state store, context builder, orchestrator, App | Memory continuity is broken | M | Medium | Contract schema | Reloaded UI history equals next-model history. |
| P1 | Await all memory operations and normalize errors | memory manager, backend handlers/routes | CRUD serializes promises | S | Low | Tests | Memory integration tests pass; zero unhandled rejection. |
| P1 | Add local API authentication | server/client/bootstrap | Localhost is not a sufficient trust boundary | M | Medium | Secret/token storage | Unauthorized state-changing calls return 401; UI still works. |
| P1 | Repair root/data/vault path resolution | `backend/index.cjs`, server/config/client hints | Assets and vault are outside expected project | S/M | Low | User-selected directories | Cross-platform paths resolve; no hardcoded personal absolute paths. |
| P1 | Clean install/release workflow | package scripts/docs/CI | Bundled modules cannot start/build cross-platform | S | Low | Target Windows machine | Fresh clone/ZIP + `npm ci` builds, tests, starts, health passes. |

### Phase B — Repair Voice Pipeline

| Priority | Task | Files | Reason | Effort | Risk | Dependency | Acceptance criteria |
|---|---|---|---|---|---|---|---|
| P1 | Implement explicit voice state machine | new voice reducer/store; `App.tsx`; voice hooks | Prevent overlap/impossible states | L | Medium | Core contracts | Listening and speaking cannot coexist unless explicit full-duplex mode; all transitions tested. |
| P1 | Make STT selection health-driven | recorder/voice agent; voice status | Current fallback fails | M | Medium | Typed status | Unavailable local STT selects browser before recording where supported. |
| P1 | Replace per-turn Whisper with persistent worker | voice service/new Python worker | Major latency/stability bottleneck | L | Medium/High | Installer/model policy | Model loads once; multiple utterances reuse it; cancel works. |
| P1 | Repair Kokoro packaging/configuration | Kokoro provider; installer/config/status | Primary TTS unavailable | M/L | Medium | Decide embedded vs external service | Startup verifies endpoint; synthesis integration test passes or degraded mode is explicit. |
| P1 | Propagate cancellation/request IDs | client, server, orchestrator, providers, voice worker/player | Prevent stale work/audio | L | Medium/High | State machine | New request cancels/discards old text/audio; cancel reaches workers. |
| P2 | Implement sentence-aware TTS queue | speech processor, backend TTS, player | Slow first audio | L | Medium | Streaming/partial model output | First sentence plays while later text is generated; ordered chunks only. |
| P2 | Fix voice setting resolution | voice config/settings/resolver | Selected voice may not apply | S/M | Low | Typed voice config | Preview, saved setting, status, and audible provider voice match. |
| P2 | Improve VAD and recorder cleanup | `useAudioRecorder.ts` or worker | False starts/cutoffs/leaks | M/L | Medium | State machine | Pre-roll/tail/noise calibration tests; tracks and timers close within one second. |

### Phase C — Improve Agent Intelligence

| Priority | Task | Files | Reason | Effort | Risk | Dependency | Acceptance criteria |
|---|---|---|---|---|---|---|---|
| P1 | Separate provider-specific credentials/models | assistant config/providers | Config can route wrong key/model | M | Low/Medium | Secret store | Status shows exact provider/model; invalid combinations fail at startup. |
| P1 | Build persisted tool approval workflow | registry, orchestrator, new approval service/routes/UI | Agent tools are disconnected | L/XL | High | Auth, contracts, state machine | Exact call can be approved/denied once; expiry and audit log enforced. |
| P1 | Enforce permissions and schemas centrally | registry/runner | Low-risk tools bypass permissions | M | Medium | Approval model | Every tool validates schema and permission before execution. |
| P2 | Implement bounded iterative agent loop | orchestrator | Multi-step tasks stop early | L | Medium/High | Tool workflow | Maximum steps enforced; duplicate loops blocked; progress/cancel supported. |
| P2 | Add token-aware context and real retrieval | context/memory/Firebase | Low-quality or unbounded context | L | Medium | Canonical memory | Context report shows token allocation; search is query-dependent and scoped. |
| P2 | Harden untrusted memory/tool content | prompt builder/provider adapters | Prompt injection risk | M | Medium | Structured message model | Retrieved/tool content is delimited and cannot redefine system/tool policy in tests. |

### Phase D — Refactor Architecture

| Priority | Task | Files | Reason | Effort | Risk | Dependency | Acceptance criteria |
|---|---|---|---|---|---|---|---|
| P2 | Split server into routers/services | `backend/server.cjs` | Mixed responsibilities | L | Medium | Contract tests | Route behavior unchanged; each subsystem router independently tested. |
| P2 | Split main App and Interface component library | `App.tsx`, `Interface.tsx` | Mixed UI/business logic | L | Medium | State machine/contracts | App composes services/views; no direct API logic in presentation controls. |
| P2 | Standardize provider interfaces | AI/STT/TTS modules | Duplicate/stub implementations | L | Medium | Voice/provider tests | Every provider implements health/capabilities/execute/cancel/error mapping. |
| P2 | Replace polling with event-driven health/progress where useful | status/SSE/client | Expensive and stale polling | L | Medium | Realtime broker | Heartbeats, event IDs, reconnect, and snapshot resync tested. |
| P3 | Remove/archive orphan and duplicate modules | apps/voice stubs/docs | Maintenance confusion | M | Low | Import/coverage report | Build/test references only supported implementation. |

### Phase E — Improve Frontend and UX

| Priority | Task | Files | Reason | Effort | Risk | Dependency | Acceptance criteria |
|---|---|---|---|---|---|---|---|
| P1 | Remove fake success and dead controls | briefing, workspace, chat input | Misleading product behavior | S | Low | None | Every visible control is functional or disabled with explanation; no fabricated completion text. |
| P2 | Add diagnostics and provider badges | active UI/new diagnostics panel | Users cannot identify failing stage | M | Low | Unified status/error model | Shows backend, mic, STT, AI, memory, tool, TTS, request ID, timings, safe last error. |
| P2 | Add accessible active-state feedback | controls/orb/chat | Voice UI needs clarity and keyboard/screen-reader access | M | Low | State machine | Keyboard, focus, ARIA live, reduced motion, permission recovery pass tests. |
| P2 | Drive visualization from real data | orb/waveform | Decorative visuals can lie | M | Low/Medium | Audio analyser/player metrics | Listening uses real mic amplitude; speaking uses real playback amplitude where available. |
| P3 | Responsive/overflow and workspace cleanup | shell/workspaces/styles | Polish after functionality | M | Low | Active feature set | Core screen works at target sizes/zoom without hidden critical controls. |

### Phase F — Production Readiness

| Priority | Task | Files | Reason | Effort | Risk | Dependency | Acceptance criteria |
|---|---|---|---|---|---|---|---|
| P1 | Add regression/integration/E2E test suite | tests, Playwright fixtures | Core defects escaped typecheck | L | Medium | Stable contracts | All P0/P1 regression tests run in CI; fake media/provider tests pass. |
| P1 | Add structured tracing/metrics | logger, client, server, providers | Failures are hard to correlate | L | Medium | Request IDs | One trace ID spans UI, STT, model, tools, memory, TTS; secrets redacted. |
| P1 | Upgrade vulnerable dependencies | package manifest/lock | Audit findings | M | Medium | Test suite | Audit severity accepted/zero per policy; clean install/build/tests pass. |
| P2 | Create reproducible Windows release/installer | scripts/CI/docs | Current ZIP is not runnable across systems | L | Medium | Clean install and external service strategy | Release contains no secrets/node_modules source tree; installer verifies prerequisites and health. |
| P2 | Graceful shutdown/recovery | server/workers/DB | Avoid orphan processes/corruption | M | Medium | Persistent workers | Shutdown closes requests/SSE/DB/children within deadline; restart recovers state. |
| P2 | Operator/user documentation | docs | Configuration is ambiguous | M | Low | Final architecture | Setup, providers, data paths, privacy, backup, troubleshooting documented and tested. |

### Files most likely to change first

`src/lib/braceClient.ts`, `src/App.tsx`, active chat/input components, `src/voice/useAudioRecorder.ts`, `src/voice/useVoiceAgent.ts`, `src/voice/useAudioPlayer.ts`, `backend/server.cjs`, `backend/index.cjs`, `backend/config/stateStore.cjs`, `backend/memory/memoryManager.cjs`, `backend/assistant/context/assistantContextBuilder.cjs`, `backend/assistant/orchestrator.cjs`, assistant config/provider modules, `backend/assistant/tools/assistantToolRegistry.cjs`, `backend/voice/voiceService.cjs`, `backend/voice/kokoroProvider.cjs`, and test files.

---

## 18. Recommended Target Architecture

A full rewrite is unnecessary. Evolve the existing system into explicit layers:

```text
Frontend
├─ UI views/components
├─ Assistant state machine
├─ Typed API client generated/shared from contracts
├─ Request controller (ID, AbortController, generation guard)
├─ Audio capture service
├─ Playback queue
└─ Diagnostics/event client

Backend
├─ HTTP/API layer
│  ├─ auth, limits, validation, error mapping
│  ├─ assistant router
│  ├─ voice router
│  ├─ memory router
│  ├─ tool/approval router
│  └─ status/events router
├─ Request coordinator
│  ├─ lifecycle/deadline/cancellation
│  └─ typed progress events
├─ Assistant service
│  ├─ context budgeter
│  ├─ provider router
│  ├─ bounded agent loop
│  └─ response assembler
├─ Tool service
│  ├─ schema validation
│  ├─ permission policy
│  ├─ approval store
│  └─ audited execution
├─ Memory service
│  ├─ conversations
│  ├─ summaries/facts
│  ├─ document retrieval
│  └─ deletion/correction
├─ Voice services
│  ├─ persistent STT worker
│  ├─ TTS provider router
│  └─ sentence/chunk stream
├─ Storage adapters
│  ├─ SQLite
│  ├─ optional Firebase
│  └─ optional Obsidian
└─ Observability
   ├─ structured logs
   ├─ timings/provider health
   └─ redaction
```

### Shared response/error model

```ts
interface ApiSuccess<T> {
  ok: true;
  data: T;
  requestId: string;
}

interface ApiFailure {
  ok: false;
  error: {
    code: string;
    message: string;
    retryable: boolean;
    stage?: "mic" | "stt" | "agent" | "tool" | "memory" | "tts" | "playback";
  };
  requestId: string;
}
```

Choose either “client returns envelope” or “client unwraps data and throws typed error.” Do not mix both. The recommended frontend client unwraps and returns typed `T`, while preserving request ID/error metadata in a typed exception/diagnostics store.

### Provider interfaces

```ts
interface ProviderHealth {
  available: boolean;
  degraded: boolean;
  provider: string;
  modelOrVoice?: string;
  capabilities: string[];
  safeReason?: string;
}

interface AiProvider {
  health(): Promise<ProviderHealth>;
  stream(request: AiRequest, signal: AbortSignal): AsyncIterable<AiEvent>;
}

interface TtsProvider {
  health(): Promise<ProviderHealth>;
  synthesize(chunk: SpeechChunk, signal: AbortSignal): Promise<AudioChunk>;
}
```

### Event flow

All events include `requestId`, timestamp, sequence, stage, and safe payload:

```text
request.started
voice.listening
stt.partial / stt.final
agent.thinking
agent.tool.requested
agent.approval.required / approved / denied
agent.tool.started / completed / failed
assistant.delta / assistant.completed
voice.tts.chunk_ready
voice.playback.started / completed / interrupted
request.completed / failed / cancelled
```

### Error model

- User receives a plain action-oriented message.
- Diagnostics receives a machine code, stage, provider, duration, retryability, and request ID.
- Logs receive safe stack/details with redaction.
- Provider raw errors never go directly to the UI or LLM.

### Logging model

Each structured record should include:

```text
timestamp, level, requestId, sessionId, conversationId,
component, operation, provider, durationMs, outcome, errorCode
```

Never log API keys, auth headers, full service-account JSON, complete voice audio, or unredacted sensitive conversation content.

---

## 19. Quick Wins

1. Rotate/remove exposed credentials and add a CI secret scan.
2. Change `App.tsx` to consume the actual unwrapped assistant result and add a contract test.
3. Normalize active chat messages to `content` and call `saveChat()` after successful turns.
4. Add missing `await` to all memory handlers/callers and close the failing tests.
5. Remove hardcoded `hasGeminiKey={true}`, greeting/name, vault hints, and fake success messages.
6. Delete or disable the dead attachment/voice/stop controls until their paths exist.
7. Make `stopAgent` call a real request-cancel endpoint or remove it.
8. Enforce `requiredPermission` for every tool before any execution.
9. Fix `repoRoot` and use cross-platform data/vault path selection.
10. Exclude `.env`, `node_modules`, and generated artifacts from source ZIPs; require clean `npm ci`.
11. Increase health-check cache and move dependency probes out of request-critical synchronous paths.
12. Fix timer cleanup in `useAudioRecorder.ts` and ensure one active recorder.
13. Return a clear “Kokoro not installed/configured” state rather than pretending the configured provider is ready.
14. Align server/body/audio limits and reject too-long recordings before base64 conversion.
15. Remove orphan components after an import/route confirmation pass.

---

## 20. Final Verdict

**Is the codebase repairable?** Yes. The project has a useful UI shell, recognizable subsystem boundaries, provider implementations, a local persistence base, safety utilities, and a good speech-text cleanup module. The core defects are significant but concentrated in contracts, lifecycle coordination, configuration, and incomplete integrations.

**Does it require partial refactoring or a full rebuild?** Partial refactoring. A full rebuild would discard working UI/provider/safety code and introduce unnecessary risk. The assistant orchestration, request state/cancellation, memory contracts, approval workflow, and persistent voice-worker architecture need substantive redesign, but they can be introduced behind existing routes/components in phases.

**What should remain?** React/Vite foundation, the visual design direction, core `http` localhost model if local-only remains the target, SQLite as local storage, provider class concept, bounded command execution with `shell:false`, log redaction, speech-text processor, and conservative default blocking of direct high-risk tool execution.

**What should be replaced or heavily revised?** The response-contract handling, generic provider config, current chat/memory wiring, per-utterance Whisper subprocess, external/untracked Kokoro path, boolean-based voice state, non-resumable tool approval behavior, plaintext secret storage, and unprotected state-changing local APIs.

**Safest implementation order:** security rotation and reproducible install first; API/chat/memory contract stabilization second; voice state/cancellation and persistent STT/Kokoro setup third; provider/tool/approval improvements fourth; UI polish and realtime streaming fifth; production testing/observability/release hardening last.

**Expected outcome after the roadmap:** B.R.A.C.E should reliably accept text and voice commands, show the actual stage of work, retain the same conversation context the user sees, use a predictable provider, execute only permitted/approved tools, begin speaking before long answers finish, stop immediately when interrupted, recover visibly from backend/provider failure, and be installable without embedded credentials or platform-specific dependency artifacts.

---

## Appendix A — Confirmed command failures and likely root causes

| Command | Exit/result | Relevant error | Classification |
|---|---|---|---|
| `npm test` | Exit 1 | 5 of 25 tests failed; async memory rejections | Code/config/test drift |
| `npm run build` | Exit 127 | `vite: Permission denied` | Bundled dependency permissions/environment artifact |
| direct Vite build | Exit 1 | Missing platform-native Rolldown binding | Bundled dependency tree/optional native package mismatch |
| backend startup in audit container | Exit 1 | `better-sqlite3` invalid ELF header | Native module built for different OS |
| `npm audit --omit=dev` | Exit 1 | 1 high, 9 moderate findings | Dependency risk |
| TypeScript no-emit | Exit 0 | No type errors | Types do not currently encode real API payloads strongly enough |

## Appendix B — Unverified runtime items

The following require a clean target-machine installation and controlled test credentials/devices:

- Actual Windows browser microphone permission/device behavior.
- Faster-whisper model installation, model size, CPU performance, and transcription accuracy.
- Kokoro/Edge/Google voice quality and actual provider availability.
- Gemini/NVIDIA provider connectivity, quotas, and model access.
- Firebase rules/data behavior against the intended project.
- Obsidian vault content and permissions.
- App launching, file dialogs, recycle-bin behavior, and VS Code integration on Windows.
- Real latency numbers and echo/self-hearing behavior with speakers and microphone.

These uncertainties do not weaken the confirmed source-level contract, memory, secret, path, and lifecycle findings.
