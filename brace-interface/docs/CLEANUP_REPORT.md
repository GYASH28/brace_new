# B.R.A.C.E Cleanup Report

Date: 2026-06-03

## Cleanup Policy

No user data, `.env` file, service account file, memory vault content, local app state, source module, or backend source log folder was deleted.

`backend/logs` was preserved because it is source code, not a generated runtime log directory.

## Removed Files And Folders

| Path | Reason | Risk |
| --- | --- | --- |
| `release/` | Generated Electron packaging output, including old portable EXEs and installer payloads. Localhost mode no longer requires EXE artifacts. | Low |
| `output/` | Generated Playwright/performance screenshots. | Low |
| `dist/` | Generated Vite production build output. Regenerates with `npm run build`. | Low |
| `electron-smoke.err.log` | Generated smoke-test log. | Low |
| `electron-smoke.log` | Generated smoke-test log. | Low |
| `vite-brace.err.log` | Generated dev log. | Low |
| `vite-brace.out.log` | Generated dev log. | Low |
| `vite-dev.err.log` | Generated dev log. | Low |
| `vite-dev.log` | Generated dev log. | Low |
| `vite-live.err.log` | Generated dev log. | Low |
| `vite-live.out.log` | Generated dev log. | Low |

## Kept Files And Folders

| Path | Reason | Risk |
| --- | --- | --- |
| `.env` | May contain local secrets or user-specific configuration. | Do not remove |
| `node_modules/` | Required local dependency install. | Low |
| `backend/logs/` | Source folder used by backend logger modules. | Do not remove |
| `BRACE-Brain/` outside `brace-interface` | User knowledge and memory vault. | Do not remove |
| `package-lock.json` | Dependency lockfile. | Do not remove |
| `docs/` | Required documentation deliverables. | Do not remove |

## Gitignore Improvements

Updated `.gitignore` to ignore:

- Runtime logs at `/logs/` and `/runtime-logs/`
- `*.log`
- Generated build output: `/dist/`, `/dist-ssr/`, `/release/`, `/out/`, `/output/`
- Caches: `/.cache/`, `/.vite/`
- Test artifacts: `/coverage/`, `/test-results/`, `/playwright-report/`
- TypeScript build metadata: `*.tsbuildinfo`
- Packaged app artifacts: `*.exe`, `*.msi`, `*.dmg`, `*.AppImage`
- Secrets: `.env`, `.env.*`, `service-account*.json`, `google-credentials*.json`

The broad `logs` ignore rule was removed because it can hide valid source folders named `logs`.

## Archived Files

None. The removed items were confirmed generated artifacts. Uncertain files were kept.
