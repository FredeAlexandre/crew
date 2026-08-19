---
id: repo-setup
type: task
status: ready
title: Monorepo foundation
summary: "Apps, packages, tools, and the rules for where code lives. Do this before engine or view-model."
parent: goal-decoupled-tracks
blocked_by: []
discovered_from: []
relates:
  - goal-playable-crew
  - engine-model
  - view-model
  - mil-engine
  - mil-view-model
  - mil-skin
workspace: ""
change_ids: []
bookmark: ""
---

Turn this documentation repo into a TypeScript monorepo that encodes the
three tracks (`PRESENTATION.md` §1). Land the skeleton, the toolchain, and
`documentation/stack.md` so later tasks have a home. Do not implement deal,
projection, or the geometry skin here.

This item is the stack decision. Transcribe it into `documentation/stack.md`
when implementing; do not relitigate unless a constraint below is wrong.

## Why this stack

A Crew table is turn-based, hidden-information, 3–5 devices, reconnect by
`room.snapshot`. The engine is authoritative and isomorphic. The skin is
DOM + CSS, not a canvas. The playground must work with fixtures and no
room. Hosting should be free, previewable per PR, and able to hold a
WebSocket room.

That rules out Next.js/RSC (this is not a document site), Colyseus schemas
that duplicate the engine, Tailwind-as-UI-kit (fights “physical, not
webby”), and serverless functions as the play path (no long-lived WS).

## Layout

pnpm workspaces + Turborepo. Node 22+ (24 on this machine). Engine code
must run in Vitest, Node, and Cloudflare Workers — no `node:fs`, no DOM.

```text
apps/web            Vite SPA: table + playground routes
apps/server         Hono Worker: HTTP + Room Durable Object
packages/protocol   IDs, intents, facts, snapshot envelope (Zod)
packages/engine     Pure rules. Depends on protocol only
packages/view-model Projection(engine state, viewerSeat). protocol + engine
packages/db         Drizzle schema + migrations (auth, room index, later campaign)
```

`apps/web` must not import `packages/engine`. Fixture *validity* lives
beside the engine; the skin binds to view-model JSON only.

## Communication

Typed JSON over WebSocket. Schemas in `packages/protocol`.

```text
client  --intent-->  Room DO  →  engine.apply(intent)
client  <--fact----  projector(engine, seat)     PRESENTATION.md §10
client  <--snapshot- view-model                    room.snapshot
```

- Intents: `playCard`, `takeTask`, `passTask`, `useSonar`, `toggleDistress`,
  `passCard`, `setReady`, `start`, `peekLastTrick`, … — never raw engine
  mutations, never pixels.
- Facts: event names and payloads from the contract. Every message has
  `attemptId` + monotonic `seq`.
- Snapshot: the view-model body. Reconnect hard-applies it and drops motion.
- HTTP (Hono) only for health, auth session, create/join room by code.
  Not for playing cards.
- No tRPC, GraphQL, or Socket.io. No sending full engine state to a client.

Local stub for this task: health + echo WS is enough. Real intents land
with `v1-table-flow` / `engine-mission`.

## Frontend (`apps/web`)

**Fit:** React + Vite + TypeScript. Regions are components; the playground
is a route; agents and a11y tooling are strongest here. TanStack Router
for `boot` / `lobby` / `playground`. Not Next.js.

**UX / abstraction (base deps):**

- Bind the skin to the view-model only. Local UI state (selected card,
  overlay open, skip-animations) stays in the client — a thin
  `useTable()` hook (snapshot + `sendIntent`). No Redux. No store until
  a third scene actually needs it.
- **React Aria Components** (headless) for overlay focus trap, Esc,
  keyboard, hit targets — style them as table objects, not dialogs.
- **CSS modules + custom properties** for tokens (suits, one accent,
  motion durations from §11). Layout = CSS grid + container queries on
  the table. No Tailwind, no component kit with chrome, no Framer Motion
  (CSS `transform`/`transition` per §13).
- **Zod** at the wire boundary (shared with protocol).
- Inline SVG cards later (`skin-geometry`). No asset pipeline yet.

**Tools:**

- **Biome** — lint + format, one tool.
- **Vitest** + Testing Library — hook and region unit tests.
- **Playwright** job stub — playground smoke in `phone-portrait` and
  `desktop` frames; real fixtures wait on `view-fixtures`.
- **TypeScript** `strict`. **Knip** for dead exports. **dependency-cruiser**
  (or equivalent) for the import graph below.
- `@t3-oss/env-core` for env. No git hooks; `pnpm check` + CI are the gate
  (jj workspaces and hooks fight).

**Rules (healthy skin):**

- New screen chrome is a **region** in `PRESENTATION.md`, then a
  component. No one-off `div` for “that thing in the corner.”
- Skin never imports engine, never decides legality, never names a new
  event. Need a new fact? Contract first, then view-model, then skin.
- Scenes/overlays are folders; shared pieces live under `regions/`.
- Motion is CSS; the engine is never `await`ed. `prefers-reduced-motion`
  maps to `instant`.
- Hit targets ≥44px; suit is color + symbol; no hover-only information.

## Backend (`apps/server`)

**Fit:** Hono on a Cloudflare Worker. One **Durable Object per room**
(the table is a single consistency domain: turn order, hidden hands,
snapshot reconnect, hibernatable WS). `@cloudflare/vite-plugin` so
`pnpm dev` is one command. Engine stays a pure library the DO calls.

**UX / abstraction (base deps):**

- Room DO = orchestration only: authz (this socket owns this seat),
  apply intent, persist snapshot, fan out per-seat facts. **No rules
  in the room.**
- Inject RNG seed into the engine at deal; tests use fixed seeds.
  Never wall-clock inside `packages/engine`.
- Structured JSON logs: `roomId`, `attemptId`, `seq`, `playerId`.
  **Never log hidden hands or legal-card sets.**

**Tools:** same Biome / Vitest / tsc / Knip. Engine tests are the rules
oracle; server tests fake sockets and assert fan-out + snapshot, not
follow-suit.

**Rules (healthy server):**

- Intents in, facts out. If a function knows both pixels and legality,
  it is in the wrong package.
- Authorize every intent against `PlayerId` → seat. Cheating the wire
  must fail even if the view-model would have hidden the control.
- DO storage holds the live engine snapshot (survive hibernation).
  D1 does not hold in-trick state.

**Storage:** **Drizzle + SQLite.** Local file / libsql; prod **Cloudflare D1**.

| Data | Owner | Store |
| --- | --- | --- |
| Hands, tricks, tasks, legality | engine | DO memory + DO snapshot |
| Per-seat visibility / affordances | view-model | derived; not source of truth |
| Selected card, overlays, skip-anim | skin | client only |
| `PlayerId`, display name, session | auth | D1 + HTTP-only cookie |
| Room code, host, occupancy | server | DO + D1 index for join |
| Connection dim/reconnect | server | DO, ephemeral |
| Campaign / logbook | later | D1 (`later-campaign`) |

v1 D1 tables: Better Auth tables + `players` + `rooms` (code, host,
status). No attempt history required to play a table.

**Auth:** **Better Auth**, anonymous/guest plugin, Drizzle/D1 adapter.
v1 is a guest `PlayerId` that survives refresh and can reclaim a seat.
Room code ≠ identity. Email/OAuth only when campaign needs a durable
crew. Sessions are cookies, not tokens in logs or `localStorage`.

## Packages — when to create one

Create a package when it has a **public API** (`index.ts`), a **single
owner**, and **two consumers** (or a runtime boundary: engine must not
ship in the browser bundle). Otherwise it is a folder inside an app.

- Do not deep-import another package’s `src/`.
- Do not add a package for one helper.
- New package: name, owner, allowed dependents, one-paragraph why — in
  `documentation/stack.md` and in the cruiser graph.

**Import graph (enforced in CI):**

```text
engine       → protocol
view-model   → protocol, engine
db           → (nothing in the game graph)
web          → protocol, view-model
server       → protocol, engine, view-model, db
```

**Who owns new code:** if it changes what is legal, `packages/engine`
and `GAME.md`. If it changes what a seat may see, `packages/view-model`
and `PRESENTATION.md` §9. If it changes a name on the wire, `protocol`
and `PRESENTATION.md` §4 / §10. If it is pixels, motion, or sound,
`apps/web` and the skin chapter. If it is who is seated or connected,
`apps/server`.

**Critical parts** (break these and the product is wrong):

1. Engine purity and determinism (seeded RNG).
2. View-model as the cheat boundary (`PRESENTATION.md` §9).
3. Intent authz (seat ownership) on the server.
4. `room.snapshot` + `seq` for reconnect (`v1-reconnect`).
5. No hidden information in logs, Sentry, or analytics.

## Host + CI/CD

**Host (free, previewable, WS-capable):** Cloudflare.

- `apps/web` → Pages
- `apps/server` → Workers + Durable Objects + D1
- SFX sprite later → same origin or R2
- PR preview URLs for both web and worker

Not Vercel for the play path. No Docker in v1. No second Node host.

**CI (GitHub Actions), every PR:** `pnpm check` = format, lint, typecheck,
Knip, dependency-cruiser, unit tests. Playwright smoke when playground
fixtures exist (allow skip until then). Preview deploy after green.

**Ship:** merge to `main` deploys production. No npm publish; the apps
are the artifacts. Required status checks before merge.

**Review:** fixture JSON diffs are the view-model review surface; engine
tests are the rules review surface; cruiser failures mean a track leaked.
Short PR template: track (engine / view / skin / repo), contract file
touched, how you played it locally.

**Local (was the task achieved?):**

```text
pnpm dev      web + worker; playground route renders a hello fixture
pnpm check    same gates as CI
pnpm test     engine/protocol/view-model/server unit tests (stubs ok)
```

Two browser profiles against one room code is the multi-seat check once
rooms exist; for this task, health + playground route is enough.

**Production debug:** `wrangler tail` + client **Sentry** (free). Scrub
hands and legal-card arrays from breadcrumbs. Reproduce from
`attemptId`/`seq` and a fixture, not from a video of the skin. Cloudflare
Web Analytics only (no product-surveillance suite in v1).

## Acceptance

- Layout above exists; each package `tsc`s; import graph is enforced.
- `documentation/stack.md` records this decision (source after close).
- `pnpm dev` / `pnpm check` / `pnpm test` documented in a short README.
- CI workflow on PR; deploy workflow to Cloudflare (may need secrets).
- D1 schema stub + Better Auth guest session stub (create guest, cookie
  round-trip), not a lobby.
- Echo WS or equivalent proves the worker ↔ client pipe.
- `engine-model` and `view-model` unblocked: they land in
  `packages/engine` and `packages/view-model`.
