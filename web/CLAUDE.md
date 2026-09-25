# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working in `web/`,
the front end of this repository (the root `CLAUDE.md` maps the rest).

# Title CRM — the rules that are not local

An implementation of the Claude Design "Title CRM 897": one application for a US
title-abstracting vendor's production pipeline, workload assignment, invoicing,
HRMS for an offshore team in India, county coverage, reports and configuration.
There is no other documentation in `web/` and no comments in the code, so
this file carries the product rules and the seven invariants that hold across
files — nothing in the file you are editing will tell you about them.

## The product rules

- **The production seat comes first.** Staff work a queue for a full shift; admin
  density never costs them legibility.
- **WCAG 2.2 AA is a hard floor** on every screen, and **phone width is real**: no
  screen may scroll sideways as a page.
- **Explain, don't hide.** Every exception, refusal and "late" names its cause and
  the fix.
- **Rules are structural.** A rule is checked where the write happens, not only in
  the control that should have prevented it.
- **One record, many views.** A personal view and a company view read the same
  data and narrow to the caller.
- Money is USD on the client side and INR on the staff side; staff read times in
  IST, clients in ET, so every time on screen carries its zone.

## Running

```bash
npm run dev                              # front end on :5173, seed data, no database needed
npx vitest run src/domain/assignment/sla.test.ts   # one test file
npx vitest run -t 'self-review'          # tests whose name matches
```

The API side:

```bash
cp .env.example .env      # the two database URLs and BETTER_AUTH_SECRET
npm run db:push           # tables, as the owner
npm run db:rls            # app_user and row-level security
npm run db:seed           # workspaces, people, counties, catalog; every person can sign in
npm run server            # API on :8787, proxied from the dev server at /api
```

There are two connection strings on purpose. `DATABASE_URL` is the owner, which
bypasses row-level security, and is used only by `db:push`, `db:rls` and
`db:seed`. `APP_DATABASE_URL` is `app_user`, which owns and bypasses nothing, and
is the only one the server uses; the server refuses to start if its role would
bypass the policies. Seeded accounts sign in with any seeded email and the
password `titlecrm-dev`. Without a database the build signs in on seed data
(`VITE_DEMO_IDENTITY`, `src/shared/lib/demo.ts`), which checks no password and
must be off before real records are connected. `tests/db`
skips itself when `APP_DATABASE_URL` is unset, so a green `npm test` locally may
not have run the isolation suite — CI runs it against a real Postgres. Test files
run serially (`fileParallelism: false` in `vitest.config.ts`) because the
isolation tests share one database.

## Gates

```bash
npm run lint        # eslint . --max-warnings 0
npm run typecheck   # tsc -b
npm test            # vitest run
npm run build       # tsc -b && vite build
npm run knip        # knip
```

All five must pass. CI runs the same five scripts rather than the commands
behind them, so a script and CI cannot drift apart
([`.github/workflows/ci.yml`](../.github/workflows/ci.yml), which runs from `web/`).

`typecheck` is `tsc -b`, and all three project configs set `noEmit: true`
(`tsconfig.app.json`, `tsconfig.node.json`, `tsconfig.test.json`). Keep it
that way. A stray `.js` emitted beside a source
file wins Vite's resolution over the `.tsx` it was built from, so the app serves
the stale copy and every later edit looks like it did nothing — which is why
`.gitignore` ignores compiler output under `src/`, `server/`, `api/` and
`tests/`. The reason lives here, because `.gitignore` may not carry a comment.

## 1. Time is read through `now()`

```ts
import { now } from '@/shared/lib/clock'
```

`new Date()` and `Date.now()` are lint errors, matched by selector, with the
message naming the replacement (the `no-restricted-syntax` block in
`eslint.config.js`).

Everything dated measures against that one instant: every countdown, overdue
flag, SLA checkpoint, ageing figure and payroll period. It is pinned to
`SEED_NOW` — Mon 3 Aug 2026, 5:30 PM, the end of the working day the design
shows (`src/shared/lib/clock.ts`) — which is what makes the figures on screen the
design's figures, and makes them reproducible in a test. More than 50 modules
under `src/` read it.

The rule is enforced because it was once only documented. The payroll screen drifted
back to the wall clock, so approving a run stamped it with a date the rest of
the register disagreed with, and the stamped value could not be pinned in a test.

`new Date(2026, 7, 3)` with arguments is fine, and is how seed dates are written
— the selector rejects only the zero-argument form and `Date.now()`.

The restriction is scoped to `**/*.{ts,tsx}`, so the `.mjs` scripts are outside
it by file type. Four paths are exempted explicitly, each in its own config
block: `clock.ts` and `main.tsx` drop only the clock selectors and keep the
dynamic-`import()` boundary selectors that share `no-restricted-syntax` with
them (invariant 7), the server keeps only its own dynamic-import selectors, and
`tests/db` turns the rule off:

| Path | Why |
| --- | --- |
| `src/shared/lib/clock.ts` | where the clock is defined |
| `src/app/main.tsx` | the entry point, the one place that may call `setClock(() => new Date())`. It holds no clock call today, so the application runs pinned. |
| `server/**/*.ts` | the server has no seed clock to pin |
| `tests/db/**/*.ts` | fixture keys must be unique per run rather than reproducible |

A test that needs a different date calls `setClock`, and `resetClock` after
(`src/shared/lib/clock.ts`, `src/shared/lib/clock.test.ts`). The company's SLA-clock
setting is `setSlaClock()` in `src/domain/assignment/turnaround.ts` and has nothing to
do with this one.

## 2. `design.css` is a port, not source

[`src/styles/design.css`](src/styles/design.css) is the design export's
stylesheet, ported verbatim — 1,037 lines in which every colour, radius, shadow,
size and breakpoint is the design's own number, as its header says. Do not tidy
those numbers, consolidate them, reformat the file, or convert it to tokens. It
is the visual contract, and it has to stay diffable against the export.

Additions and corrections go in [`src/styles/index.css`](src/styles/index.css),
after the `@import './design.css'`. CSS may not carry a comment either (the
hygiene test reads it), so what broke and why goes here when the selector does
not say it. The pattern: the crumb that had to truncate (`.top .crumb`), the
signed-out shell (`.authshell`, `.si`, `.so`), the filter bar that took a phone
into horizontal scroll until it wrapped (`.fbar`), and three that fixed what
the port got wrong:

- `.asm b` is `display: block` in the port, so an inline bold phrase inside an
  assumption note broke its sentence onto its own line. The note's heading is
  `<b className="at">` (`Assumption` in `src/shared/ui/Banner.tsx`); `index.css`
  keeps `.asm b.at` a block and returns every other `.asm b` to inline. The
  port's heading colour `#92610a` is 2.6:1 on the dark theme's stripes, so
  `body.dark .asm b.at` takes `--warn`.
- The pay-run steps (`button.step .sn`) coloured their numbers inline, white on
  the dark theme's `--brand`/`--ok` at under 3:1. The state is on the button's
  class (`.step.now`, `.step.done`) and the colours are in `index.css`, dark
  ones on `--bg`.
- `.chip` never wraps, so a long role name ran past its table cell and under the
  next column. `.cell .chip` wraps inside its cell.

Import order is load-bearing: Tailwind first, `design.css` second, so the
design's unlayered component rules beat Tailwind's `utilities` layer.

## 3. Two data paths, and the screens are on the seed one

The application runs both ways, and only one of them is wired to the screens.

- **Seed.** The screens read `src/data/*.ts`, bundled at build time rather than
  fetched. That is why `npm run dev` alone shows all of it with no database, and
  why the numbers are the design's. Two datasets are not static imports:
  `loadDeliveries()` in `src/data/deliveries.ts` pulls the 767-row delivery
  history (`deliveries.json`) in dynamically, and `loadQcLog()` in
  `src/data/quality.ts` the 1,048-row QC log (`quality-log.json`), so each chunk
  is requested only by the four screens that read it
  (`src/shared/hooks/useDeliveries.ts`, `src/shared/hooks/useQcLog.ts`).
- **Server.** A Hono API mounts six route modules under `/api` (the
  `app.route()` calls in `server/index.ts`). Queries go through `withTenant()`, so they are
  scoped by row-level security rather than by remembering a `WHERE` clause.
  There is one deliberate exception: the memberships lookup is what you call to
  find a workspace, so it cannot run inside one. It is a narrow
  `SECURITY DEFINER` function returning only the caller's own rows
  (`preflightRoutes.get('/memberships')` in `server/routes/session.ts`,
  `app_memberships` in `server/db/rls.sql`).

Exactly two modules under `src/` import `@/shared/lib/api`:
`src/domain/auth/SessionProvider.tsx` and
`src/features/auth/sign-in/SignInPage.tsx`. Capabilities are the one thing already migrated —
`can()` answers from `/api/me` whenever a server is reachable and falls back to
the bundled roles otherwise, and `authority` on the session says which is in
force (`src/domain/auth/SessionProvider.tsx`). The session hands the server's
answer to `setServerAuthority()` in `src/domain/auth/permissions.ts`, so the
`can()` / `refusal()` every write calls give the same answer as the screen;
there is no second reader. Everything else on screen is still seed data.

**Migrating a screen: do it a navigation group at a time, not a screen at a
time.** A group shares its data, so a half-migrated group is the only genuinely
confusing state — half a register from the API and half from the bundle, with no
way to tell which figure came from where.

`src/data/types.ts` and the database describe the same domain but do not share
field names — `Order` is `{cl, pr, stt, st, co, prop}` where the `orders` table
is `{clientId, productId, status, state, county, property}`
(`interface Order` in `src/data/types.ts`, `orders` in `server/db/schema.ts`),
and the routes return table rows unmapped (`c.json(rows)` throughout
`server/routes/reference.ts`). So a migrated
screen needs a mapping, not only a different source.

## 4. The short field names stay short

Six files under `src/data/` are generated from the design export by a script
that is not in this repository — `business`, `catalog`, `hrms`, `org`, `people`
and `production`, plus the two JSON datasets. They carry no header, so
`.gitattributes`, which marks them `linguist-generated`, is the list. The rest of
`src/data/` is hand-written: the domain types (`types.ts`), the loaders that
revive the two JSON datasets (`deliveries.ts`, `quality.ts`), and eight smaller
modules of values — among them `workflow.ts` (the stage names and the SLA clock)
and `documents.ts` (the documents every order starts with).

The field names are the design's own: `n` a name, `k` a key, `st` a status, and
`d` a date in most shapes but a description in three (`Shift`, `Connector`,
`LeaveType`) — the design's own inconsistency, copied on purpose. `types.ts`
cannot say so itself (no comments), so this paragraph is where it is said.

Where the seed keeps a date as text (`doj`, `dob`, a holiday's, swap's,
overtime claim's or punch's `d`, a document's `recorded`, a closed run's `at`),
the text is always `MM/DD/YYYY`, whatever the company's format: `usDate()` writes
it, `parseUsDate()` reads it, `fmtUsDate()` prints it in the company's format,
and a date typed on a form is read in that format by `parseDate()` and stored
through `usDate()` — `claimOvertime()` and `requestSwap()` refuse one that does
not parse, naming the format (`src/shared/lib/format.ts`).

Renaming them makes the seed data and the design disagree, and a regeneration
would put them straight back. For the same reason, a defect fixed in the
generated output is a defect a regeneration reintroduces:
`tests/data/dates.test.ts` exists as the guard against exactly that. The typed
rule set skips every `src/data/*.ts` except `types.ts`, because that one is the
hand-maintained domain model, and only the import-boundary rules (static and
dynamic) and the clock rule run over the rest (`eslint.config.js`). Seed data is
the bottom layer and imports nothing but `./types` and its own JSON: a value that
depends on the clock takes the instant from its caller, as `MAILBOX(now())` in
`src/data/intake.ts` does.

## 5. Type sizes come from the scale, and there are two greys

Typography is set in [`src/styles/index.css`](src/styles/index.css), not in
`design.css` — the design's own sizes are still in the port, and every one of
them is restated in the override layer under invariant 2.

**Never write a raw px font size.** Use a step:

```
--t-mini    11     --t-small 13.5   --t-h3      18.5
--t-eyebrow 12     --t-body  14.5   --t-h2      20.5
--t-label   13     --t-lead  16     --t-h1      25
                                    --t-display 28
```

Ten steps replace the design's thirteen unrelated sizes, and every step is
larger than the value it replaced — the lift is biggest at the bottom, where
this app spends most of its time. Inline styles take the token too
(`fontSize: 'var(--t-small)'`); more than 600 of them across more than 150
files already do, so a literal `'12.5px'` appearing again is a regression, not a
local choice.

**There is no grey text.** `--gr`, `--gr2` and the sidebar's `--navtx` all
alias to `--ink` / `--navon` in `index.css` — every rule in `design.css` and
every component call site that names one of them (the `.gr` utility alone is
some 520 of them) prints in full ink now, not a lighter tone. The tokens are kept
rather than deleted only because `design.css` cannot be edited (invariant 2)
and still names them. Do not reintroduce a grey text colour, hardcoded or
through a new token — restate the alias in `index.css` if a new selector needs
one. This does not touch opacity-based dimming used as a state (a disabled
row, a zero-count chip) — that is a different signal from a text colour and is
out of scope for this rule.

The faces are Geist and Geist Mono, vendored under
[`src/styles/fonts/`](src/styles/fonts) (OFL) rather than fetched, so there is
no third-party request at first paint and no `<link>` in `index.html` to keep in
step. The `@font-face` fallbacks carry `ascent-override`/`size-adjust` computed
from Geist's own head/hhea/OS-2 tables — that, not a preload, is what stops the
swap from shifting layout. If the fonts are ever replaced, those four numbers
have to be recomputed from the new files or the overrides become wrong.

## 6. One source per fact, and the seed is read-only

A usability review in September 2026 found the same thing on screen after screen: two views of one fact, disagreeing. Each fact
below now has one reader, and a screen that reaches past it is the bug.

| Fact | Read it through | Never |
| --- | --- | --- |
| Orders — to list, count or find one | `allOrders()`, `useOrders()`, `orderById()` in `src/domain/orders/orders.ts` | `ORDERS` or `board().run.orders` directly: the seed holds 8, the run 90, and the dashboard and assignment each counted a different set |
| The orders a person may open | `ordersFor()` / `mayOpenOrder()` in `src/domain/orders/orders.ts` — every order with `all`, otherwise the ones they are on; Orders, an order's page, the commitment report and every order write read it | filtering `o.a` by hand, which let the commitment report list all 440 to someone on 69 |
| The orders received on a day | `receivedOn()` / `receivedDays()` in `src/domain/orders/received.ts` — the run's arrivals and any order taken in on screen, by the day it arrived; the seed's eight worked examples carry no intake record and are not counted | `board().run.orders` / `run.today`, which an order taken in on screen never reached |
| A person's load today | `dayLoadOf()` / `useDayLoad()` in `src/domain/orders/dayLoad.ts` — work carried in (`open`) plus the stages they hold on today's orders as they stand, by the run or by hand, split into done and on the desk. The company-wide views (Reports › Work, Assignment › Capacity and Exceptions, Company › Staff) read everyone's through `useDayLoads()` / `loadOf()`, and a department's through `teamLoad()` | `run.load`, which counted different things (19 against 14) and never saw a hand assignment. The engine keeps `run.load` for placement only |
| Today's work by person or department (Reports › Work, the department and person pages, My work) | `liveWork()` / `useLiveWork()` in `src/domain/orders/liveWork.ts` — the same orders `dayLoadOf()` reads, grouped by `staffRows()` / `deptRows()` in `src/domain/assignment/workload.ts` | the engine's once-computed rows, which a hand reassignment never moved; the board no longer carries any |
| Stages nobody holds, and today's order count on Assignment and the dashboard | `openExceptions()` / `pipelineToday()` in `src/domain/orders/orders.ts` — the run's exceptions plus the stages `addOrder()` could not place | `run.exc` / `run.today`, which an order taken in on screen never reached |
| A date on screen | `fmtDate()` for a `Date`, `fmtUsDate()` for a date the seed keeps as text, `fmtDT()` with its zone for an instant (`src/shared/lib/format.ts`); a day used as a key is `iso()`, never a printed date. `tests/repo/dates.test.ts` fails on `toLocaleDateString`, a hand-built `d/m/y`, a date literal, a printed date compared with `===`, a printed `.dk` and a raw seed date field | a printed date as a key (`receivedOn(orders, fmtDate(now()))`), which stopped matching the moment the company switched format |
| QC ratings, for any person or report | `useQcLog()` in `src/shared/hooks/useQcLog.ts` — the seed log plus every rating made in the app (`sessionQcEntries()` in `src/domain/orders/ratings.ts`) | `loadQcLog()` alone, which never saw a rating saved on an order |
| A stage's or department's name on screen | `stageName()` / `useStageName()` in `src/domain/company/naming.ts`, over the naming Company › Workflow edits. The keys in `STAGES`, `person.dep`, `a.stage`, a department's `n` and its `pair` stay identifiers and never change; only what is printed goes through the reader. Renaming a department (`saveDept()`) writes its naming row, and a new department whose name was once another's key gets a fresh key. Every pipeline stage has a row, and the status an order is in while on it (`search`, `sq`, `typing`, `tqc`, `rts`, `docreq`, and `sent`) takes its name from the same row, so `statusName()`, a status edit and a department rename agree | printing a key from `STAGES` or `.stage`, or rewriting `dep`/`n` on a rename — which orphaned every Search assignment (exceptions 32 → 121) |
| Whether a county link is broken or missing | `isBrokenLink()` (a check found it failing) / `isMissingLink()` (nothing on file) / `linkGaps()` in `src/domain/counties/links.ts` — the link monitor's badge counts broken; an order's County links tab names both | `BADSTATES.includes(...)` inline, which one screen counted with `'none'` and the badge without |
| Stages waiting on a person | `openExceptions()` | `run.exc`, which a hand assignment never lowers |
| An invoice's status | `invoicesNow()` / `statusOf()` in `src/domain/invoices/invoices.ts` | `INVOICES[].st`, a stored status that did not move when terms ran out |
| A closed pay run | `runOf(mn).kept` in `src/domain/payroll/payruns.ts` — the settings, roster and overtime it was approved with | today's `currentPayCfg()`, which rewrote a month already paid |
| Who is on the roster, and one person | `currentStaff()` / `useStaff()` / `personById()` / `findPerson()` / `whoName()` in `src/domain/people/roster.ts` | `STAFF`, which the staff form's edits never reach, or a hand-written `staff.find((s) => s.id === id)` |
| Who holds a capability | `can()` in `src/domain/auth/permissions.ts` — the server's answer for the signed-in person once `/api/me` has given one, otherwise the company's roles (`src/domain/auth/roles.ts`); `useSession().can` is the same function | `ROLELIST`, which a role edited on screen never changes, or `ADMIN_FLOOR` from `@/data/org`, which leaves out “all” (a lint error; read it from `roles.ts`) |
| An order's history | the order's events, each written with the values it describes at the time (a product change carries was → now and the SLA it re-read), opened by `historyRows()` from the order as received (`orderById()`, not as edited) | recomputing a past row from the order as it stands, which turned “MGR · LIEN” into “· FS+” |
| Whether an order is late | `dueMeta(due, deliveryOf(o))` / `<Due at sent>` — a delivered order is measured to when it was sent (`sentAt`, set by the write that sent it, or the run's finish time) and reads “delivered 3h late” or “on time” | `dueMeta(o.due)` on a sent order, which measured to now and called 337 of 364 delivered orders “overdue” |
| A new record's id | `nextId(prefix, taken)` in `src/shared/lib/ids.ts` — one past the highest number used under that prefix, so a removed id is never handed out again | a counter written by hand in a store or a form |
| Who is free on a day | `availOn()` / `onLeaveOn()` in `src/domain/leave/leave.ts` | `person.avail` alone, which ignores approved leave |
| Leave requests, policy, types and balances | `useLeave()` / `useLeavePolicy()` / `useLeaveTypes()` in `src/domain/leave/leaveStore.ts`; `leaveBalance()` / `useLeaveBalance()` in `src/domain/leave/balance.ts` | `LEAVE`, `LEAVEPOLICY`, `LEAVETYPES`, which a decision or a policy edit never reaches |
| A comp-off balance | `leaveBalance()` — earned is fixed by the seed (one per approved comp-off, plus two in hand); a request only holds or spends it | counting requests as earnings, which made a declined or cancelled request raise the balance |
| The current workspace's name | `useWorkspaces()` / `currentWorkspaces()` in `src/domain/company/company.ts`, which carry the name the Company tab edits | `TENANTS`, which a rename never reaches |
| An order status's name and colour | `useStatuses()` / `currentStatuses()` / `statusName()` in `src/domain/company/statuses.ts` | `STATUS`, which a status renamed under Company never reaches |
| A QC average | `qcAverage()` in `src/domain/quality/quality.ts` — `null` with nothing rated, printed through `averageText()` | an inline mean, which printed 0.00 for "nothing rated" |
| The reasons behind lost marks | `reasonCounts()` in `src/domain/quality/quality.ts` — a note counts only where a mark was lost | counting every note, which would call a comment on clean work a fault |
| The pay settings a month is figured with | `payCfgOf(mn)` in `src/domain/payroll/payruns.ts` — what a closed month kept, today's settings for an open one | `PAYCFG`, which the payroll settings form never reaches |
| Counties, link types and the link-check schedule | `useCoverage()` / `currentCounties()` / `currentLinkTypes()` / `currentCheck()` in `src/domain/counties/counties.ts` | `COUNTIES`, `LINKTYPES`, `LINKCHECK`, which County coverage edits never reach |
| The stage an order is at | `curStageOf()` in `src/domain/assignment/sla.ts`, on the order as edited — `arrivalOrder()` in `src/domain/orders/orders.ts` for an arrival from the run | the engine's simulated clock, which a finished or hand-set stage never moves |

Every seed value that has an edit store is a lint error to import anywhere but
the module that owns it (`SEED_OWNED` in `eslint.config.js`): the company store
(`src/domain/company/companyStore.ts` — clients, roster, roles, permissions,
departments, statuses, stage names, the SLA clock, workspaces, pay settings, SLA
and budgets), counties, orders and their starting documents, invoices, leads, leave, the time rules, the timeclock's swaps, overtime,
loans, assignment rules, levels, QC rules, petty cash, hiring and updates. Two
modules keep a seed value on purpose, each with the reason on its
`eslint-disable`: a run closed in the seed keeps the seed's settings, roster,
overtime and loans (`src/domain/payroll/payruns.ts`), and the engine's synthetic
day draws on the seed's counties so an order's county does not move when
coverage is edited (`src/domain/assignment/day.ts`). A value that gains an edit store gets a row in
`SEED_OWNED` and in this table.

**No screen writes into `src/data/`.** Anything a screen changes goes in a
`createStore` store (`src/shared/lib/store.ts`) with a `reset` added to
`tests/setup.ts`, and nothing under `src/` writes into the seed any more.
`tests/repo/seed.test.ts` parses every non-test module under `src/` and fails on
an assignment, `delete`, `++`, mutating method or `Object.assign` into anything
imported from `@/data/` — including through a `const x = SEED.find(...)` alias.
The company's settings live in one store (`src/domain/company/companyStore.ts`) so a
reset is atomic, and are read and written by concept: `company.ts` (profile, pay
settings, date format, workspaces), `naming.ts`, `statuses.ts`, `departments.ts`,
`clients.ts`, `src/domain/people/roster.ts`, `src/domain/auth/roles.ts` and
`src/domain/assignment/turnaround.ts`. The date format is company state:
the company store hands it to `applyDateFormat()` on every change and reset,
`fmtDate()` reads it, and `onDateFormat()` tells a listener. Every route's
screen is wrapped by `page()` in `src/app/router.tsx`, which subscribes through
`useDateFormat()` (`src/shared/hooks/useDateFormat.ts`), so a change redraws the
page in place: nothing remounts, local state survives, and focus stays on the
Company tab's select. Nothing may cache a printed date — the board's day keys are
`iso()` for that reason.

**Rules are checked where the write happens**, not only in the control that
should have prevented it: `selfReviewAt()` (over `wouldSelfReview()` in
`src/domain/assignment/narrow.ts`) inside `setAssignee()` / `setAssignments()`
in `src/domain/orders/orderWrites.ts` for QC pairing, `decidesOwn()` in
`src/domain/auth/permissions.ts` for any overtime, correction, swap, loan or
leave, `saveStaff()` in `src/domain/people/roster.ts`, which refuses
a record `staffProblem()` in `src/domain/people/people.ts` rejects in the same `refused`
it gives an actor without the capability, and these, each also shaping what the
screen offers:

- **An order's status** — `statusRefusal()` in `src/domain/orders/statusMoves.ts`,
  called by `setOrderField()`: cancelling needs `all`; marking Sent needs `all`
  or holding the last stage (RTS) while the order is on it, and then the same
  rating check as finishing; anyone else on the order can only move it on from a
  stage they hold while it is on that stage. `statusChoices()` is the list the
  Stage select offers, with the sentence for what is missing.
- **A QC rating** — `rateRefusal()` in `src/domain/orders/ratings.ts`, called by
  `markRated()`: a stage is rated by whoever holds its paired QC stage (Search QC
  rates Search, Typing QC rates Typing) or by `all`, and never by the person who
  worked it (`wouldSelfReview()`). `ratedForSending()` counts a rating only while
  its rater is not the stage's current holder; `finishStage()` and marking Sent
  both go through `sendingRefusal()` when the “rating required” QC rule is on.
- **A loan or advance** is asked for by the person who repays it (`requestLoan()`).
- **What someone on an order may change** — in `src/domain/orders/orderWrites.ts`:
  the header (product, borrower, property address, loan amount) needs `all`
  (`headerRefusal()`); notes, documents and the search's findings (effective
  dates, parcel, names run, vesting, legal description — also on the commitment
  report) are for whoever holds the stage the order is on now, or `all`
  (`stageWorkRefusal()`, which names the stage and its holder).
- **A hand assignment past someone's daily target** — `targetBreach()` refuses
  it while the target rule (r3) is on, with the person's load and target, until
  the assigner confirms (`setAssignee(..., { overTarget: true })`); the order's
  Assignment tab and Assignment › Exceptions ask first.
- **A new order** is placed by `addOrder()` through `previewAssign()` against
  `pipelineLoad()`, the same call the new-order preview makes; a stage it cannot
  place becomes an exception with the engine's reason.
- **An opening** — `openingProblem()` in `src/features/hrms/recruitment/hiring.ts`,
  called by `addOpening()`, which also numbers it.
- **A permission's wording** — `rewordRefusal()`: a built-in one only by someone
  who holds it, the same rule as granting it. The company's own permissions
  (`sys: false`) are descriptive — nothing in the code checks them — so any
  `people` holder may add, reword and grant them.
- **A payroll file carrying PAN, UAN, ESIC numbers or bank accounts** —
  `exportRefusal()` in `src/features/hrms/payroll/payrollFiles.ts` needs
  `people` as well as `pricing`, the same capability those fields need on a
  person's page.
- **A colleague's performance record** (quality scores, defects, stage timings on
  `/staff/:id`) — `personAccess().performance` in
  `src/features/configure/people/detail/personDetail.ts`: the person themselves,
  `people` or `assign`.

**Every write takes its actor and checks the capability itself.** A store
writer's first argument is the `Actor` (`src/domain/auth/permissions.ts`) —
the decision writers too (`decideOvertime`, `decideCorrection`, `decideSwap`,
`decideLoan`), and a correction has one writer, in `timeclock.ts` — and it
returns `refusal()`'s sentence (or `null` once written; `Saved` where it makes an id) — naming the capability and the actor's role —
instead of writing; the screen shows that sentence and disables what it cannot
do. A route guard or a hidden button is presentation, not the rule. The
capabilities: `people` for staff, roles, departments, the company profile, the
leave policy, the time rules and hiring; `config` for SLA, budgets, the SLA
clock, statuses, naming and link types; `pricing` for pay settings, pay runs,
loans, payments, clients, prefixes, leads, petty cash, order costs and payroll
files (with `people` too where a file carries identifiers); `assign` for
assignment, assignment rules, levels and leave decisions, and for reading a
colleague's performance record (as does `people`); `all` for county records, the
link check (refused as “Changing the link check”, not as a county record),
attendance decisions, overtime decisions, QC scoring rules, new orders,
cancelling an order and rating any stage but your own; `qc` for ratings, within
the pairing above. Order edits are split as above; finishing a
stage needs it to be yours or `assign`. Clocking in, filing
leave, claiming overtime and asking for a swap are for your own record only.
A role editor can grant or take away only what their own role holds
(`grantRefusal()`), which also bounds the role they can hand a person, and a
locked role keeps its lock and cannot be removed.

**Pricing is behind `can('pricing')` on every money element**, and
`npm run check:pricing` (`scripts/pricing.mjs`, run in CI's browser job) signs
in as a lead and fails on any dollar figure on any route or tab. A new money
element that forgets the check fails there.

**Logic a test should reach goes in a `.ts` beside its page**
(`src/features/**/*.ts`), with its test beside it as `<module>.test.ts`, which
`vitest.config.ts` covers; a `.tsx` is not reachable by any test here.
`src/features/production/orders/fromMail.ts` and
`src/features/insight/reports/money/money.ts` are the pattern.

Three smaller rules hold across screens: every time on screen carries its zone
(`TZ`), because for staff in India a bare time is a 9.5-hour misreading — an
arrival hour is client time, `fmtHour()` (`9:00 ET`); a shift, a punch, a late
mark and a correction are staff time, `ist()` / `shiftHours()` in
`src/domain/attendance/workingDay.ts` (`09:30 IST`), and the time clock stamps a
punch with `clockNow()`, on the India clock the shifts are written in; a table
or chart axis may carry the zone once in its heading instead of on every cell; a
`Field` labels its control, so a new form needs no `aria-label`; and a money
figure never breaks, so negatives use a true minus (`signed()` in
`src/shared/lib/format.ts`) and KPI figures scale rather than wrap.

## 7. Where code goes

Layers, bottom up: `src/data` → `src/shared/lib` → `src/domain` →
`src/shared/{hooks,ui,editors}` → `src/features/<group>/<feature>` → `src/app`.
A module imports only from its own layer or the ones below it.

- A module used by one feature lives in that feature's folder. Once a second
  feature needs it, it moves down by what it is. Rules, stores and the facts
  they answer go to `domain/`, which holds no rendered UI — its only `.tsx` files
  are the context providers over its stores. A pure helper that knows nothing
  about the business goes to `shared/lib`. A component, hook or form goes to
  `shared/{ui,hooks,editors}` whether or not it knows the business: that layer
  sits above `domain/` so it can (`StaffForm`, `RatingsTable`, the `Due` chip),
  and it is the only place UI shared by two features can live.
- Facts the app shell shows (badges, alerts) live in `domain/` even when only
  one feature uses them.
- A feature never imports another feature, and nothing imports `app/`.
- Leave a folder only through `@/`. Only a same-folder `./x`, or a `./sub/x`
  into a folder beneath it, stays relative, so the boundary rules in
  `eslint.config.js` see every crossing. The rules match plain paths, so a path
  written any other way is refused outright (`STRAIGHT`): a `./`, `../`,
  doubled or trailing slash after `@/`, or a `.ts`/`.tsx` suffix
  (`allowImportingTsExtensions` would otherwise let `@/data/people.ts` past the
  seed rules). A seed module an edit store owns may not be `import()`ed at all
  (`SEED_DYNAMIC`), since a dynamic import names none of what it takes, and
  `tests/repo/seed.test.ts` normalises a specifier before it looks. A bare `src/…` specifier is a lint error
  (and no longer resolves: the tsconfigs have `paths` and no `baseUrl`), and a
  dynamic `import()` is held to the same boundaries as a static one, by
  `ImportExpression` selectors in `no-restricted-syntax` built from the same
  patterns (`dynamic()` in `eslint.config.js`). `server/` imports nothing from
  `src/` but `src/data`, by a straight path — a `..` after `src/data` is a lint
  error too. A module at the root of `src/` belongs to no layer and may import
  nothing.
- A feature's page files sit at its root. Its sections split into the same
  sub-folders everywhere: `tabs/` for the tabs of a root page (`*Tab.tsx`),
  `forms/` for the forms a root page opens (`*Form.tsx`), and `detail/` for a
  detail page (`*DetailPage.tsx`) together with everything only it uses — its
  tabs, sections, forms and their `.ts` logic. What a root page and the detail
  page share stays at the root. `src/features/insight/reports/` is the one
  exception by size: each report tab is a folder of its own, with what the tabs
  share at the root.
- Two paths under `src/`, `server/` or `tests/` never differ only by case or
  by `.ts`/`.tsx`, because on a case-insensitive disk `./leavePolicy` then
  resolves to `LeavePolicy.tsx` (`tests/repo/paths.test.ts`). A domain folder's
  main module takes the folder's name (`people/people.ts`, `orders/orders.ts`).
- Hooks live in `src/shared/hooks/` even when they return UI (`useNotBuilt`,
  `useBudgetHelp`); `shared/{hooks,ui,editors}` are one layer and may import
  each other.
- Tests (`*.test.ts`, beside the module they cover) are exempt. A test is named
  for that module, `<module>.test.ts` or `<module>.<topic>.test.ts`
  (`orders/orderCounts.test.ts`, `leads/leads.book.test.ts`), and
  `tests/repo/paths.test.ts` fails on one with no such module beside it. They are
  type-checked as strictly as the app (`tsconfig.test.json`, like
  `tsconfig.app.json` and `tsconfig.node.json` for the server, carries
  `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`); a test that needs
  a row to exist takes it through `must()` or `one()` in `tests/must.ts`, which
  fail with what was missing rather than a `!`.
- A component file stays under 400 lines and a hand-written `.ts` module under
  300 (`max-lines` in `eslint.config.js`, blank lines not counted; tests and
  `src/data` are exempt). A longer screen splits by section into files beside
  it; a longer module splits by concept — the engine into `day.ts` (the
  synthetic day), `narrow.ts` (one stage's pool and why it emptied), `engine.ts`
  (the run and the board) and `workload.ts` (who and which department has what);
  payroll into `payroll.ts`, `structure.ts`, `fiscalYear.ts`, `settlement.ts`
  and `amountInWords.ts`; orders into `orders.ts` (the store and every read) and
  `orderWrites.ts` (every write and the rule it checks).
- A list that can run to hundreds of rows shows the first `LIST_CAP` (40) and a
  "Show all N" control: `useCappedList()` in `src/shared/hooks/useCappedList.ts`
  (over `capList()` / `sameItems()` in `src/shared/lib/cap.ts`) and `ShowAll` in
  `src/shared/ui/ShowAll.tsx`. "Show all" folds back the moment the list's items
  change — a new focus, range or filter — and stays folded if they change back;
  a list merely worked out again with the same items keeps it, and rows rebuilt
  on every render pass a `keyOf` so that holds for them too. Anything a row needs worked out is worked out once for
  the list in a `.ts` helper, not per row in render.
- A store module that sits beside the rules for the same thing is
  `<thing>Store.ts` (`company/companyStore.ts`, `leave/leaveStore.ts`,
  `loans/loanStore.ts`, `petty-cash/pettyStore.ts`); a module that is both the
  store and its rules takes the thing's name (`orders.ts`, `leads.ts`,
  `hiring.ts`, `payruns.ts`).
- A new feature folder must be added to `FEATURES` in `eslint.config.js`;
  until it is, it cannot import from any feature, its own included.

**Screens are built from shared components only.** No `.tsx` outside
`src/shared/ui` writes a raw `<button>`, `<input>`, `<select>`, `<textarea>`,
`<table>`, `<label>` or `<a>`; each comes from `src/shared/ui` (`Btn`, `Press`,
`IconButton`, `Pill`, `LinkButton`, `Seg`, `Input`, `Select`, `Textarea`,
`Checkbox`, `Radio`, `MatrixTable`/`Th`, `Anchor`, `MailLink`), which carries the
design's classes and an accessible name. `Field` is the one thing that writes a
`<label>`: a control inside it takes `field`, a control with no visible label
takes `label` (its accessible name), and one with neither does not type-check.
The `RAW` entries of `no-restricted-syntax` in `eslint.config.js` fail the lint
gate on any of the seven in `src/features`, `src/app` and
`src/shared/{editors,hooks}`, naming the component to use. Recurring spacing
goes through `Note`, `Inline` and the `top`/`bottom`/`margin` props of `Card` and
`Banner` rather than a fresh inline style.

## No comments, no docs

The code carries no comments and the repository no documentation besides this
file. The only comments allowed are functional directives — `eslint-disable…`
with its reason, `@ts-expect-error`, `/// <reference>` — plus the
`AUTO-GENERATED` header a data generator may write and `src/styles/design.css`,
which is the design export's own file (invariant 2). A reason that needs writing
down goes in this file. `tests/repo/hygiene.test.ts` fails the test gate on a
comment or a document anywhere else.
