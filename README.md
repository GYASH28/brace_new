<div align="center">

# B.R.A.C.E — Experimental Agent OS Iteration

**A browser-first experimental branch of the B.R.A.C.E local AI companion.**

> ⚠️ **Not currently recommended as a pinned or production-ready repository.**

</div>

## Overview

This repository contains an experimental B.R.A.C.E iteration focused on a localhost browser experience, a modular Node.js backend, multi-layer agent workflows, memory, telemetry, voice, project tooling, and a spatial operating-system-inspired interface.

The actively presented flagship repository is:

```text
GYASH28/B.R.A.C.E
```

## Current Direction

- React and TypeScript interface
- Vite localhost development mode
- Modular Node.js backend
- Gemini-first provider configuration
- Local SQLite-backed state and memory
- Firebase Admin integration
- Voice and text-to-speech experimentation
- React Flow agent and knowledge visualizations
- Permission-controlled tools and local workflows
- Health checks, backend tests, and Playwright testing

## Technology Stack

| Area | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS |
| State and forms | Zustand, React Hook Form, Zod |
| UI | Radix UI, Framer Motion, Lucide, Recharts, React Flow |
| Backend | Node.js, better-sqlite3, Firebase Admin, node-cron |
| Documents | mammoth, pdf-parse |
| Voice | Google Cloud Text-to-Speech and local-provider experiments |
| Testing | Node test runner, Playwright |

## Run Locally

```bash
cd brace-interface
npm install
npm run dev:localhost
```

Frontend:

```text
http://127.0.0.1:5173
```

Backend:

```text
http://127.0.0.1:8787
```

Health check:

```bash
npm run health
```

## Security Status

Historic public commits in this experimental repository included credentials. Removing a key from the latest source does not remove it from Git history.

Before this repository is treated as safe or showcased publicly:

1. Revoke every credential that appeared in any commit
2. Create fresh replacement keys
3. Store secrets only in environment variables or an ignored `.env` file
4. Clean the Git history with `git filter-repo` or BFG Repo-Cleaner
5. Force-push the sanitized history
6. Re-run secret scanning
7. Audit local data, logs, and generated files before publishing

Never reuse credentials that have appeared in a public commit.

## Repository Status

This repository is retained as an experimental development branch. Use `GYASH28/B.R.A.C.E` as the main public project until the security cleanup and repository consolidation are complete.
