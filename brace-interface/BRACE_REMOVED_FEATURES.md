# B.R.A.C.E Removed Features

During the UI and feature audit, the following features and UI components were identified as broken, non-functional, or placeholders, and were safely removed to streamline the application:

## 1. Local Brain Fallback (`src/lib/brain.ts`)
- **Reason:** Contained 8 hardcoded memory entries (e.g., LERNIO references, favorite color) that were never actually called by `App.tsx`. The real application uses the backend server to resolve queries via Gemini and its own data stores.
- **Action:** Deleted `src/lib/brain.ts` entirely.

## 2. Hardcoded App Data (`src/data/appData.ts`)
- **Reason:** Contained static mock metrics (`systemMetrics`, `recentFiles`, `scheduledTasks`, `promptChips`, `quickActions`). 
- **Action:** Removed these unused arrays from `appData.ts`. Only `navItems` was kept as it drives the actual sidebar layout.

## 3. Fake AI Orb Component (`src/components/Interface.tsx`)
- **Reason:** An unused `<AIOrb>` component existed alongside the functional `<VoiceOrb>`. It was never rendered anywhere in the application.
- **Action:** Removed `AIOrb` from `Interface.tsx`.

## 4. Wake Word Placeholder (`src/voice/VoiceSettings.tsx`)
- **Reason:** A toggle with the label "Wake word placeholder" existed in voice settings, with no backing implementation.
- **Action:** Removed the toggle component from `VoiceSettings.tsx`.
