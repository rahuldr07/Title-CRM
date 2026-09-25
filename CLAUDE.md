# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Title CRM — repository map

| Folder | What it is | Toolchain |
| --- | --- | --- |
| `web/` | The front end: React 19 + TypeScript + Vite, on bundled seed data. Also holds `web/server`, a TypeScript (Hono + Drizzle + Postgres RLS) API prototype that the real backend replaces. | Node 22, npm, run everything from `web/` |
| `backend/` | Not started. The production API, in its own language and toolchain. | its own |

`web/CLAUDE.md` carries the front end's rules, gates and invariants; read it before
touching anything under `web/`.

## Rules across folders

- Each folder owns its toolchain, lockfile and CI job. CI (`.github/workflows/ci.yml`)
  runs `web/` jobs only when `web/**` changes; a `backend/` job gets its own path
  filter. Nothing at the root installs or builds.
- The API contract between `web/` and `backend/` lives in one place, not in either
  codebase: when the backend starts, add `contracts/openapi.yaml` as the source of
  truth, generate the front end's client from it, and have the backend validate
  against it. Until then the contract is `web/server/routes` plus the row shapes
  in `web/server/db/schema.ts`.
- Postgres keeps row-level security: tenant isolation stays in the database, not
  in whichever language queries it (`web/server/db/rls.sql` is the reference).
  The backend takes over migrations and the RLS script; `web/server` is deleted
  once the screens no longer need it.
- The front end migrates to the backend one navigation group at a time
  (`web/CLAUDE.md`, invariant 3).
