# BRACE Backend Wiring Audit

## Frameworks
- Frontend: React + Vite + TypeScript
- Backend Runtime: Node.js (CommonJS, .cjs)
- Desktop Shell: Electron

## Architecture Breakdown
- **Entry Points**: 
  - `electron/main.cjs` (production/desktop)
  - `backend/server.cjs` (localhost Dev server)
- **Orchestrator**: `index.cjs` maps routes to internal handlers.
- **AI Router**: `ai/providerRouter.cjs` and `assistant/orchestrator.cjs`.
- **Memory**: Firebase (remote) and Obsidian (local).
- **Tools**: Dynamic tool registry in `tools/`.
- **State/Config**: Local JSON via `stateStore.cjs`. Sync file operations found here.

## Issues Identified
- **Port Management**: `server.cjs` missing `EADDRINUSE` handling.
- **Health Route**: `GET /health` is lacking active provider / memory status.
- **Sync IO**: `stateStore.cjs` uses `fs.writeFileSync`.
- **Logs**: `activityLogger.cjs` slices to 1000 logs but is synchronous. Chat history slices to 250 in `index.cjs`.
- **Security**: Need to check API key exposure. 

## Action Plan
- Expand `GET /health`.
- Add port conflict detection.
- Optimize `stateStore` async saving.
- Add Error handling standard structure.
