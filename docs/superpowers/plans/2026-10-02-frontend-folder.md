# Frontend Folder Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put the complete TanStack Start frontend application and its tooling under `frontend/`, then install its npm dependencies there.

**Architecture:** `frontend/` becomes the working directory for the React/TanStack Start application, including `src/`, `public/`, package metadata, and frontend build/test/lint configuration. The repository root retains Supabase migrations, project documentation, environment-independent repository settings, and the root `.gitignore`.

**Tech Stack:** React, TypeScript, TanStack Start, Vite, Nitro, Vitest, ESLint, Prettier, npm.

## Global Constraints

- All frontend source, assets, package metadata, and frontend tooling must live under `frontend/`.
- Preserve application behavior and existing dependency versions.
- Run `npm i` from `frontend/` after the move.
- Do not commit or expose `.env` contents.

---

### Task 1: Move frontend application and tooling into `frontend/`

**Files:**
- Move: `src/` → `frontend/src/`
- Move: `public/` → `frontend/public/`
- Move: `.env` → `frontend/.env`
- Move: `.prettierignore` → `frontend/.prettierignore`
- Move: `.prettierrc` → `frontend/.prettierrc`
- Move: `bun.lock` → `frontend/bun.lock`
- Move: `bunfig.toml` → `frontend/bunfig.toml`
- Move: `components.json` → `frontend/components.json`
- Move: `eslint.config.js` → `frontend/eslint.config.js`
- Move: `package.json` → `frontend/package.json`
- Move: `tsconfig.json` → `frontend/tsconfig.json`
- Move: `vite.config.ts` → `frontend/vite.config.ts`
- Move: `vitest.config.ts` → `frontend/vitest.config.ts`

**Interfaces:**
- `frontend/package.json` remains the source of npm scripts and dependency declarations.
- `frontend/vite.config.ts`, `frontend/tsconfig.json`, and `frontend/vitest.config.ts` resolve paths relative to `frontend/`.

- [x] Create `frontend/` if needed and move the listed application files/directories without changing their contents.
- [x] Confirm no frontend source, assets, package manifest, or frontend config remains at the repository root.
- [x] Keep `supabase/`, `README.md`, `roadmap.md`, `.gitignore`, and repository-level documentation at the root.

### Task 2: Update repository ignore and documentation paths

**Files:**
- Modify: `.gitignore`
- Modify: `README.md`

**Interfaces:**
- Root `.gitignore` must ignore both root and nested environment files, including `frontend/.env`.
- README development commands must run from `frontend/`.

- [x] Add `frontend/node_modules/`, `frontend/dist/`, and `frontend/.output/` coverage through root ignore patterns or explicit entries.
- [x] Update README commands to `cd frontend` before dependency installation and development commands.
- [x] Preserve the existing Supabase-only architecture and other project requirements.

### Task 3: Install and verify frontend dependencies

**Files:**
- Create: `frontend/package-lock.json`
- Create: `frontend/node_modules/` (ignored local install output)

**Interfaces:**
- `npm i` must execute from `frontend/` using `frontend/package.json`.

- [ ] Run `npm i` from `frontend/` — blocked by npm `EACCES` while fetching `@eslint/js` from the registry.
- [ ] Run `npm run lint` from `frontend/` — unavailable because dependencies could not be installed.
- [ ] Run `npm test` from `frontend/` — unavailable because dependencies could not be installed.
- [ ] Run `npm run build` from `frontend/` — unavailable because dependencies could not be installed.
- [x] Confirm the moved app contains no broken root-relative frontend paths.
