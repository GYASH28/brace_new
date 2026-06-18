# BRACE OS Discovery Report

## Overview
This document summarizes the current state of the BRACE project across the local filesystem, identifying canonical repositories, migration sources, and the state of features before initiating the AI-Native Operating Environment upgrade.

## Project Repositories

### Canonical Repository
- **Path:** `c:\Users\Admin\Desktop\new brace\brace-interface`
- **State:** Active, browser-first (Vite + React) + Node.js backend.
- **Notes:** Contains recent feature audits (`BRACE_UI_FEATURE_AUDIT.md`, `BACKEND_AUDIT_PLAN.md`), indicating active development and cleanup. Electron integration has been stripped from this version.

### Migration Source (Legacy/Electron)
- **Path:** `c:\Users\Admin\Desktop\projects\B.R.A.C.E-MAIN\brace-interface`
- **State:** Older iteration, Electron-based (`electron/main.cjs`).
- **Notes:** Retains the `electron-builder` configuration for native Windows packaging. This repo will serve as a reference for any desktop shell preload bridges if we re-integrate Electron/Tauri later.

## Feature State

### Currently Working Features
- Sidebar navigation, TopBar status, Clock.
- Settings persistence, API key saving, Permission toggles.
- Chat send/receive, history clear/export.
- Basic Tasks, Notes, Memory, Projects, Logs CRUD operations via the backend.
- Command palette (Ctrl+K).
- Basic Voice Pipeline (Web Speech STT, fallback browser TTS, backend STT/TTS).
- VoiceOrb state display.

### Broken/Partially Working
- Markdown rendering in chat is completely absent.
- Multiline chat input is unsupported (uses raw `<input>`).
- Code blocks have no syntax highlighting or copy buttons.
- Offline mode claims tools are available when they are not.

### Deprecated / Removed Features
- `src/lib/brain.ts` (Local Brain Fallback)
- Hardcoded App Data mock metrics
- Fake `AIOrb` component
- Wake word placeholder toggle

## Architecture Analysis
- The frontend is heavily centralized in a monolithic `App.tsx` (over 2000 lines).
- Backend runs independently via `server.cjs` serving an API on port 8787.
- Integration uses a `braceClient` to handle local HTTP or Electron IPC.

## Conclusion
The path forward will focus on `c:\Users\Admin\Desktop\new brace\brace-interface`. The first major technical debt hurdle will be dismantling the `App.tsx` monolith to support dynamic contextual workspaces.
