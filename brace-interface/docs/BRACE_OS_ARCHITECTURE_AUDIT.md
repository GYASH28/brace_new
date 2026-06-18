# BRACE OS Architecture Audit

## 1. Current Architecture
### 1.1 Overview
The BRACE interface is currently structured as a monolithic React application running via Vite, connected to a local Express/Node.js backend.

### 1.2 Frontend (`App.tsx` Monolith)
- **State Management:** Handled largely via local component states within a massive `App.tsx` file (2000+ lines).
- **Routing:** Manual state-based rendering (`activePage`) instead of a robust client-side router.
- **UI Components:** Reusable components exist in `Interface.tsx`, but lack critical OS-like features such as contextual workspace rendering and deep markdown support.
- **API Client:** `lib/braceClient.ts` abstracts communication to the backend, defaulting to `http://127.0.0.1:8787`.

### 1.3 Backend (`backend/server.cjs`)
- **API Engine:** Express.js based API managing endpoints for files, tasks, chat, system data, and external model interactions.
- **Current Limitations:**
  - `BACKEND_AUDIT_PLAN.md` notes significant stability and security vulnerabilities, particularly regarding timeouts, request limits, structured logging, and system tool execution via the shell.
  - Rate limiters and request boundaries are rudimentary and susceptible to overload or out-of-memory errors.

## 2. Target Architecture
As defined by the BRACE AI-Native OS Master Prompt, the target architecture requires transitioning into a decoupled, secure, and event-driven localhost environment:

### 2.1 Unified Localhost Architecture
- **Frontend:** React + TypeScript + Vite. Move away from the monolith towards dynamic Workspaces (General, Coding, Client, etc.).
- **Backend:** Node.js + TypeScript. Implement modular routing with strict input validation.
- **Realtime:** Transition from basic polling/request-response to Server-Sent Events (SSE) or WebSockets for agent monitoring, terminal streaming, and voice transcription states.
- **Database:** Migrate state persistence to SQLite for high-performance operational state tracking (tasks, agent runs, approvals, notifications).
- **Long-term Memory:** Obsidian Vault integration acting as the human-readable brain.

### 2.2 Security Layer (Permissions Engine)
Implement a unified strict permissions layer:
- Level 0 (Read-only) to Level 3 (Explicit Approval).
- The frontend must render structured Approval Cards for actions requiring level 2 or 3 clearance.

### 2.3 Model Router & Agent Subsystems
- **Model Router:** Abstract API calls to support dynamic routing across Gemini, local LLMs, and TTS (Kokoro) based on latency, mode, and explicit user preference.
- **Agent Subsystems:** Migrate from a single "assistant" call to a specialized multi-agent workflow (FRIDAY, FORGE, PIXEL, etc.) coordinating through the backend.
