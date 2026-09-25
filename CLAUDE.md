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

# Frontend roadmap

Agreed 25 Sep 2026, not started. The team tracks status in a spreadsheet (Title-CRM-Frontend-Tasks.xlsx, one row per ID below); this section is the same plan for an agent. Work is `web/` only: the backend is Python FastAPI, built separately, and its `/openapi.json` is the API contract.

## Decisions

- **Components:** rebuild `web/src/shared/ui` on shadcn/ui (Radix), themed to the design's tokens (brand, ink, radius, shadows, Geist, dark mode) in Tailwind v4 `@theme`, so screens keep the Title CRM look but gain real behaviour. Keep the current component APIs (`Btn`, `Card`, `Tabs`, `openModal()`, `toast()`) as wrappers so the screens migrate gradually. `design.css` stops being the untouchable visual contract once B9 lands; update invariant 2 in `web/CLAUDE.md` then.
- **Toasts:** Sonner behind `notify.success/error/warning/info/loading` and `notify.promise()`, with actions (Undo, View order), stacking and pause on hover. `toast(msg)` maps to `notify.info` during the migration. Form errors stay inline, not in toasts.
- **Forms, tables, charts:** react-hook-form + zod, TanStack Table, Recharts through shadcn charts.
- **Data:** API types are generated from FastAPI's OpenAPI and never hand-written. DTOs are mapped to the domain model at the edge (`<concept>.mapper.ts`), responses are Zod-parsed, and server state lives in TanStack Query. Keep `createStore` (or Zustand behind the same API) only for client state.
- **Not doing:** Redux, a second component library, hand-written copies of API types.

## Tasks (ID · task · depends on)

Phase 1, foundations (no backend needed):
- A1 · types generated from FastAPI `/openapi.json` into `web/src/shared/api/generated/`, CI check that they are current
- A2 · DTO ↔ domain mappers per concept · A1
- A3 · Zod schema per DTO, responses parsed at the edge, schemas reused for forms, `env.ts` validated at startup · A1
- A4 · HTTP client in `shared/lib/http/`: base URL, tenant header, cookies, timeout, GET retry with backoff, `x-request-id`, 401 → sign-in, 403 → capability message
- A5 · one `AppError` (network, timeout, unauthorized, forbidden, validation, notFound, conflict, server) and `messageFor()`; per-widget error boundaries · A4
- A6 · logger `shared/lib/log.ts` with context, PII redaction, console in dev and Sentry or `/log` in prod, `no-console` lint · A4
- A7 · common types: `Result`, branded ids, `Money`, `IsoDate`, `Instant`, `Paginated`, sort and filter specs, as-const statuses
- A8 · helpers: number and percent formatting, debounce and throttle, `assertNever`, `invariant`
- A9 · typed `config.ts` and `flags.ts` (seed or API per navigation group) · A3
- A10 · decide in-house store or Zustand, behind `createStore`/`useStoreSlice`
- F5 · remove `@vitest/coverage-v8`, resolve local `package-lock.json` edits, Vercel root directory `web`

Phase 2, first visible pass:
- B1 · shadcn init and theme tokens
- B2 · primitives: Button, Input, Textarea, Select, Checkbox, Switch, Radio, Badge, Card, Tabs, Tooltip, Popover, DropdownMenu, Dialog, Sheet, Skeleton, Separator, ScrollArea · B1
- B3 · current component APIs rebuilt on shadcn · B2
- B4 · Sonner toasts · B1
- B5 · stackable Dialog and a Sheet drawer replace the single global modal · B2

Phase 3, components and UX:
- B6 · forms on react-hook-form + zod, a date picker that shows the zone, comboboxes for client, county and person (~50 forms) · A3, B2
- B7 · one TanStack `DataTable`: sort, sticky header, density, column visibility, pagination, labelled rows on phones (~50 tables) · B2
- B8 · charts, Ctrl+K command palette, row-action menus, tooltips · B2
- C1 · move recurring inline `style={{}}` (687 left) into primitives · B2
- C2 · skeletons on every list, card and detail · B2
- C3 · empty states that say why and what next
- C4 · global search in the command palette · B8
- C6 · motion that respects `prefers-reduced-motion` · B2
- C9 · inline validation, save state, unsaved-changes warning · B6
- F1 · restore permission and money-maths tests, a Playwright journey per role in CI

Phase 4, polish and features:
- B9 · retire unused `design.css`/`index.css` rules; update invariant 2 · B3, B6, B7
- C5 · production-seat keyboard shortcuts and a `?` help dialog · B5
- C7 · dark theme pass on every screen · B1
- C8 · mobile: bottom nav for staff, larger touch targets, cards for wide tables · B2
- C11 · one spacing, radius and shadow scale; a dev-only component gallery · B9
- E1 · invoice create and send · B6
- E2 · won lead → client with deal value · B6
- E3 · recruit marked Joined → staff record · B6
- F2 · web-vitals, lazy routes, bundle budget, cache times · A6
- F3 · CSP and Referrer-Policy headers, no `dangerouslySetInnerHTML`, no secrets in `VITE_*`
- F4 · axe accessibility check in CI

Phase 5, backend integration:
- D1 · API modules per concept (`orders.api.ts`) · A1, A4
- D2 · query-key factories, TanStack Query hooks, optimistic updates · D1
- D3 · `useOrders()` and the other readers become wrappers over query hooks · D2
- D4 · migrate Production → Business → HRMS → Reference → Configure; delete `web/server` · D3, A9
- D5 · silent refresh, cross-tab sign-out, production build fails with demo mode on · A4
- C10 · real-time notification centre · B4, D1
- C12 · print styles for payslips, invoices and the order report
- E4 · per-tenant branding · B1
- E5 · carried backlog from the API instead of the seed · D4
