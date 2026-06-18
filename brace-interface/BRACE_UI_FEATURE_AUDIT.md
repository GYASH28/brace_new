# B.R.A.C.E UI & Feature Deep Audit

**Date:** 2026-06-09  
**Auditor:** BRACE UI/UX Specialist Agent  
**Scope:** Full frontend — App.tsx (2091 lines, 96KB), Interface.tsx (576 lines), index.css (790 lines), voice/* (9 files), lib/* (2 files), data/* (1 file), types.ts, main.tsx

---

## 1. App Structure

### 1.1 Framework & Build
- **Framework:** React 19 (StrictMode), Vite 8 with Tailwind CSS v4 plugin
- **Styling:** Tailwind CSS v4 + index.css (790 lines of custom CSS classes)
- **Animation:** Framer Motion v12
- **Icons:** Lucide React v1.16
- **Runtime:** Electron 42 (desktop) or localhost HTTP (browser dev mode)
- **Entry:** `main.tsx` → `<App />` mounted on `#root`

### 1.2 Component Architecture
| Component | File | Size | Purpose |
|---|---|---|---|
| `App` | App.tsx | 96KB / 2091 lines | **Monolithic** — ALL state, routing, pages, logic |
| `Interface` | components/Interface.tsx | 22KB / 576 lines | Reusable: GlassCard, StatusBadge, Sidebar, TopBar, AIOrb, ChatBubble, ChatInput, etc. |
| `VoiceOrb` | voice/VoiceOrb.tsx | 5KB | Dedicated voice orb with state-reactive visuals |
| `VoiceControls` | voice/VoiceControls.tsx | 3.6KB | Command dock: mode segment + textarea + mic + send |
| `VoiceSettings` | voice/VoiceSettings.tsx | 11KB | Full voice configuration panel |
| `useVoiceAgent` | voice/useVoiceAgent.ts | 13KB | Voice agent hook: STT → AI → TTS pipeline |
| `useAudioPlayer` | voice/useAudioPlayer.ts | 4.4KB | Browser SpeechSynthesis wrapper with chunks |
| `useAudioRecorder` | voice/useAudioRecorder.ts | 12.5KB | Mic + Web Speech API + backend transcription |
| `speechTextProcessor` | voice/speechTextProcessor.ts | 7.7KB | Markdown cleanup for spoken text |
| `voiceEmotionEngine` | voice/voiceEmotionEngine.ts | 3.5KB | Tone detection and delivery profile |
| `voiceStateStore` | voice/voiceStateStore.ts | 1.2KB | Default config + labels |
| `braceClient` | lib/braceClient.ts | 11KB | Dual-mode API client (Electron IPC or HTTP) |
| `brain` | lib/brain.ts | 4.5KB | **Client-side** fallback brain with 8 hardcoded entries |
| `appData` | data/appData.ts | 4.3KB | Nav items, quick actions, **static system metrics** |

### 1.3 Routing
- **No router library** — manual `activePage: PageId` state switch in `renderPage()` (App.tsx:797-923)
- 15 pages: home, chat, voice, agent, tasks, files, memory, notes, tools, projects, system, apps, permissions, logs, settings
- Page transition via `<PageShell>` with Framer Motion fade/slide

### 1.4 Layout Structure
```
<div.min-h-screen>
  <div.background-grid />
  <div.background-glow-a />
  <div.background-glow-b />
  <div.flex.h-screen>
    <Sidebar />              — left, hidden on mobile, collapsible
    <section.flex-col>
      <TopBar />             — top status tiles + clock
      <PageShell>            — animated page content
        {renderPage()}
      </PageShell>
    </section>
  </div>
  <MobileNav />              — bottom fixed nav, mobile only
  <DesktopHoverDock />       — bottom hover/pinned dock, desktop only
  <CommandPalette />         — Ctrl+K overlay
  <Toast />                  — bottom-right notification
</div>
```

### 1.5 Backend API Usage
- All API calls go through `braceClient` (lib/braceClient.ts)
- Electron: uses `window.braceDesktop` IPC bridge
- Localhost: HTTP to `http://127.0.0.1:8787` (configurable via VITE_BRACE_API_BASE_URL)
- ~60+ API endpoints covering: state, settings, chat, AI, system, files, tasks, apps, agent, memory, notes, projects, voice, greeting

### 1.6 Electron Integration
- `window.braceDesktop` bridge for native file pickers, IPC events
- `onHotkey`, `onAgentEvent`, `onApprovalRequest` event listeners
- `clearAllData` restricted to Electron mode
- Desktop dock with handle + pinning

---

## 2. Current UI Problems

### 2.1 Critical Layout Issues
| Problem | Location | Severity |
|---|---|---|
| **App.tsx is 96KB monolith** | App.tsx | HIGH — hard to maintain, all 15 pages + logic in one file |
| **Chat area has no markdown rendering** | ChatBubble (Interface.tsx:337-382) | HIGH — just `{message.text}`, no markdown/code blocks |
| **Chat uses plain `<input>` not `<textarea>`** | ChatInput (Interface.tsx:402-412) | MEDIUM — no multiline support, Enter always sends |
| **No code block copy button** in chat | ChatBubble | MEDIUM — assistant code responses not copyable |
| **Home page HUD rails hidden below 1280px** | HomePage:1098, 1154 | MEDIUM — readout + action rails use `hidden xl:flex` |
| **Chat scroll container height ambiguous** | ChatPage:1247-1255 | MEDIUM — `flex min-h-0 flex-1` may clip on some resolutions |
| **Bottom dock overlaps page content** | CSS .has-bottom-dock | LOW — padding compensation exists but may not match |
| **`home-stage` grid breaks on small widths** | CSS:784-789 | LOW — falls back to `flex justify-center`, hides rails |
| **Sidebar bottom panel shows hardcoded status** | Sidebar:214-226 | LOW — "Core linked", "Memory synced", "Safe mode active" are static text, not live |

### 2.2 Visual Issues
| Problem | Location | Severity |
|---|---|---|
| **Background grid scanline animation** runs continuously | CSS:96-104 | LOW — 9s infinite animation, uses GPU |
| **AIOrb (Interface.tsx:292-315) is unused in home** | Interface.tsx | WASTE — VoiceOrb is used instead on home page |
| **Duplicate orb components** | AIOrb in Interface.tsx vs VoiceOrb in voice/VoiceOrb.tsx | CLEANUP — AIOrb is never rendered |
| **Status tiles overflow on narrow viewports** | TopBar:269 `top-status-scroll` | LOW — horizontal scroll, may hide tiles |
| **Very small text** throughout | `text-[10px]`, `text-[11px]`, `text-xs` | LOW — may be hard to read |

### 2.3 Spacing & Contrast
- Page headers use consistent `text-xs uppercase tracking-[0.24em] text-cyan-200` — good
- Some status text uses `text-slate-600` (very low contrast on dark bg)
- `text-slate-500` is used extensively — borderline readable
- Toggle pills use `scale-75` in TasksPage and VoiceSettings — tiny

---

## 3. Feature Status Audit

### 3.1 WORKING Features ✅
| Feature | Notes |
|---|---|
| Sidebar navigation (15 pages) | Collapsible, grouped, active indicator |
| TopBar status tiles | Live brain/voice/memory/tools status |
| Clock badge | Updates every second |
| Page transitions | Framer Motion fade |
| Chat send/receive | Backend `assistantChat` call works |
| Chat clear/export | Working via backend |
| Auto-scroll chat | `scrollTo` on message count change |
| Settings persistence | `updateSettings` → backend |
| API key save/clear | Via `saveSecret` |
| Permission toggles | Backend-synced, logged |
| System info polling | With permission gate |
| File select (Electron) | Native picker via bridge |
| File select (localhost) | Prompt fallback with manual path |
| File drag-and-drop | Text files read in-place |
| File analysis actions | Summarize/explain/key-points/question |
| Task CRUD | Add/edit/delete/run via backend |
| App launcher CRUD | Add/delete/launch via backend |
| Agent task display | Plans, steps, risk, approval UI |
| Agent approve/reject | Backend calls work |
| Memory search/save/delete | Backend CRUD |
| Notes search/create/delete | Backend CRUD |
| Projects add/list | Backend CRUD |
| Tools list/refresh | Backend list |
| Logs list/clear/copy | Backend CRUD + clipboard |
| Command palette (Ctrl+K) | Filters nav + apps + actions |
| Toast notifications | Success/error/info |
| Hotkey listener | Electron IPC events |
| Voice recording (Web Speech) | Browser SpeechRecognition |
| Voice recording (backend STT) | MediaRecorder → transcribeVoice |
| Voice TTS (browser fallback) | SpeechSynthesis with chunks |
| Voice TTS (backend Kokoro) | synthesizeVoice → audio playback |
| Voice config save | updateVoiceConfig → backend |
| Voice preview/replay/stop | Working |
| VoiceOrb state display | idle/listening/thinking/speaking/error/muted/offline |
| Startup voice greeting | Context-aware with test button |
| Desktop bottom dock | Hover reveal + pin toggle |
| Mobile bottom nav | Fixed nav bar on mobile |

### 3.2 PARTIALLY WORKING Features ⚠️
| Feature | Issue |
|---|---|
| **Chat markdown rendering** | NO markdown at all — just raw `{message.text}` |
| **Chat multiline input** | ChatInput uses `<input>`, but VoiceControls uses `<textarea>` — inconsistent |
| **Offline mode** | Blocks AI calls but shows misleading "tools remain available from their pages" |
| **Streaming** | Toggle exists but no streaming implementation visible in frontend |
| **Voice wake word** | Toggle exists, placeholder label says "Wake word placeholder" |
| **Retry failed prompt** | Works but only shows retry button in ChatPage, not on HomePage |

### 3.3 BROKEN Features ❌
| Feature | Issue |
|---|---|
| **Code blocks in chat** | No syntax highlighting, no copy button, no fencing detection |
| **Chat message copy** | No copy button on individual messages |
| **ChatInput Shift+Enter** | ChatInput uses `<input>` so no multiline possible (only VoiceControls has textarea) |

### 3.4 FAKE / PLACEHOLDER Features 🎭
| Feature | Why it's fake |
|---|---|
| **AIOrb component** | Exists in Interface.tsx but is NEVER rendered anywhere |
| **`brain.ts` local brain** | 8 hardcoded entries, never called from App.tsx — backend does all brain work |
| **`appData.ts` static system metrics** | Hardcoded CPU=38%, RAM=62% etc. — never used in SystemPage (live data used instead) |
| **`appData.ts` recentFiles** | Hardcoded 4 files — never rendered anywhere |
| **`appData.ts` scheduledTasks** | Hardcoded 4 tasks — never rendered anywhere |
| **`appData.ts` promptChips** | 4 chips — never rendered anywhere |
| **Sidebar "Core linked/Memory synced/Safe mode active"** | Hardcoded text, not reflecting real status |
| **Wake word toggle** | Label says "Wake word placeholder" — no implementation |

### 3.5 DUPLICATE / UNNECESSARY Features 🔄
| Feature | Duplication |
|---|---|
| **AIOrb vs VoiceOrb** | Two orb components, only VoiceOrb used |
| **ChatInput vs VoiceControls** | Two input components with different capabilities |
| **`quickActions` in appData** | Never used (HomePage has its own `quickChips`) |
| **`searchBrain` in lib/brain.ts** | Never imported or called from App.tsx |
| **Workflow icon used for both Agent + Tasks** | Same icon for two different nav items |

---

## 4. State Flow Tracing

### 4.1 Chat Input → Message Send → AI Response → Display
```
User types in ChatInput/VoiceControls
  → setInput(value)
  → onSend / Enter key
    → sendMessage(query)
      → setMessages([...current, userMessage])
      → setInput("")
      → runAgentCommand(query)
        → setMessages([...pending "Thinking..." message])
        → braceClient.assistantChat({ message, voice, selectedFile, projectPath, mode })
        → result: AssistantChatResponse
        → setMessages(replace pending with final response)
        → refreshAgentState(), refreshLogs(), refreshAssistantStatus()
      → catch: setLastFailedPrompt(query), show error message
```

### 4.2 Voice Input → Transcript → AI Response → Speech Output
```
User clicks VoiceOrb / mic button
  → startVoiceListening()
    → check microphone permission
    → voiceAgent.startListening()
      → recorder.start() (useAudioRecorder)
        → getUserMedia → AudioContext → analyser → volume monitoring
        → SpeechRecognition.start() OR MediaRecorder.start()
        → onFinalTranscript(text)
          → handleTranscript(text) in useVoiceAgent
            → setOrbState("thinking")
            → addMessage(user message)
            → sendCommand(text)
              → runAgentCommand(text, { voice: true })
            → speakText(response)
              → prepareSpeechText() → cleanup markdown
              → braceClient.synthesizeVoice() → try backend Kokoro
              → fallback: browser SpeechSynthesis
              → setOrbState("speaking" → "idle")
```

### 4.3 Settings Save Flow
```
User changes setting
  → updateSettings({ key: value })
    → setSettings(merged)
    → braceClient.updateSettings(patch)
      → POST /api/settings (localhost) or IPC (electron)
```

### 4.4 Startup Flow
```
App() mounts
  → useEffect: load()
    → braceClient.state() → hydrate all state
    → refreshWorkspaceData() → tools, memories, notes, projects
    → refreshAssistantStatus() → brain, voice, memory status
    → setLoaded(true)
  → useEffect (loaded): setTimeout → runStartupGreeting(false)
    → braceClient.createStartupGreeting() → greeting text
    → addMessage(greeting) + speakText(greeting)
  → useEffect (loaded): refreshSystem(true) if systemInfo enabled
  → useEffect: save chat on change (debounced 500ms)
```

---

## 5. UI State Map

| State | Trigger | Visual |
|---|---|---|
| **idle** | Default / after speaking | Orb: breathing pulse, cyan glow |
| **listening** | Mic active, recording | Orb: expanding rings, teal glow, volume-reactive scale |
| **thinking** | Transcript received, waiting for AI | Orb: rotating data points, purple glow, scan arc fast |
| **speaking** | TTS playing | Orb: waveform bars, blue glow, reverse rotation |
| **error** | Voice/AI/connection error | Orb: shake animation, red/rose glow |
| **muted** | Volume = 0 | Orb: dimmed gray, VolumeX icon |
| **offline** | Not connected (isConnected=false) | Orb: dim slate, "Offline" label |
| **loading** | Initial state load | No explicit loading UI — app shows defaults then hydrates |
| **settings-open** | activePage="settings" | Settings page renders, sidebar highlights |
| **history-open** | N/A | No dedicated history page — chat shows messages inline |
| **voice-disabled** | voiceOutput=false | TTS skipped, orb shows "muted" |
| **backend-disconnected** | API calls fail | Toast error, status tiles show "warn" |

---

## 6. Priority Fix List

### P0 — Critical
1. Add markdown rendering to ChatBubble (code blocks, headers, lists, bold, italic)
2. Add copy button to code blocks in chat
3. Fix ChatInput to use textarea with Shift+Enter support (match VoiceControls)
4. Add loading/disabled state to send button when waiting for AI response

### P1 — Important  
5. Remove unused AIOrb component from Interface.tsx
6. Remove unused exports from appData.ts (systemMetrics, recentFiles, scheduledTasks, promptChips)
7. Remove unused brain.ts (never called from App.tsx)
8. Fix sidebar bottom panel to show real status instead of hardcoded text
9. Add typing/thinking indicator in chat (pulsing dots)
10. Add copy-to-clipboard button on assistant messages

### P2 — Polish
11. Fix homepage for screens < 1280px (show condensed readouts)
12. Improve text contrast (replace text-slate-600 with text-slate-500 minimum)
13. Remove wake word "placeholder" label
14. Consistent textarea between ChatInput and VoiceControls
15. Add empty state illustrations
16. Smooth scroll behavior improvements

---

## 7. Files to Edit

| File | Action |
|---|---|
| `App.tsx` | Fix ChatBubble rendering, send button disabled state, typing indicator |
| `components/Interface.tsx` | Fix ChatInput → textarea, remove AIOrb, add message copy, add markdown |
| `index.css` | Add markdown/code block styles, improve contrast |
| `data/appData.ts` | Remove unused exports |
| `lib/brain.ts` | Mark for removal (document in BRACE_REMOVED_FEATURES.md) |
