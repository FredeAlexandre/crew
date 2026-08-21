# Stack

This is the stack decision. Later work follows it; do not relitigate it
unless a constraint below is wrong.

## Why this stack

A Crew table is turn-based, hidden-information, 3–5 devices, reconnect by
`room.snapshot`. The engine is authoritative and isomorphic. The skin is
DOM + CSS, not a canvas. The playground must work with fixtures and no
room. Hosting should be free, previewable per PR, and able to hold a
WebSocket room.

That rules out Next.js/RSC (this is not a document site), Colyseus schemas
that duplicate the engine, Tailwind-as-UI-kit (fights “physical, not
webby”), shadcn/Radix chrome, and serverless functions as the play path
(no long-lived WS).

## Runtime and package manager

- **Node 24** (`.node-version`). Engine code must also run in Vitest and
  Cloudflare Workers — no `node:fs`, no DOM.
- **Nub** is the package manager and script runner (`nub install`,
  `nub run`, `nubx`). Workspace catalog lives on `package.json#workspaces`.
  Do not add pnpm, npm, yarn, or bun lockfiles. Do not `dnf install nodejs`.
- **Alchemy** (`alchemy dev` / `alchemy deploy`) is the one-command local
  DX: Vite SPA + Hono Worker + D1 + Durable Objects. That replaces
  Turborepo and `@cloudflare/vite-plugin` for v1. Infra lives in
  `packages/infra/alchemy.run.ts`.

## Layout

```text
apps/web            Vite SPA: boot, lobby, playground routes
apps/server         Hono Worker: HTTP + Room Durable Object
packages/protocol   IDs, intents, facts, snapshot envelope (Zod)
packages/engine     Pure rules. Depends on protocol only
packages/view-model Projection and fixtures. protocol + engine
packages/db         Drizzle schema + migrations (auth, players, rooms)
packages/auth       Better Auth guest session (server only)
packages/env        `@t3-oss/env-core` for web; Worker env types for server
packages/config     Shared TypeScript base
packages/infra      Alchemy stack (D1, Worker, Vite website)
```

`apps/web` must not import `packages/engine` or `@crew/view-model/project`.
Scene fixtures will be `@crew/view-model/fixtures` (JSON/types only; no engine).
Fixture *validity* lives beside the engine; the skin binds to view-model JSON only.

## Communication

Typed JSON over WebSocket. Schemas in `packages/protocol`.

```text
client  --intent-->  Room DO  →  engine.apply(intent)
client  <--fact----  projector(engine, seat)     PRESENTATION.md §10
client  <--snapshot- view-model                    room.snapshot
```

- HTTP (Hono) only for health, auth session, create/join room by code.
  Not for playing cards.
- No tRPC, GraphQL, or Socket.io. No sending full engine state to a client.
- v1 stub: health + echo WS. Real play intents land when the table is wired.

## Frontend (`apps/web`)

React + Vite + TypeScript. TanStack Router for `boot` (`/`), `lobby`,
`playground`. Not Next.js.

- Bind the skin to the view-model only. Local UI state stays in the client
  — a thin `useTable()` hook (snapshot + `sendIntent`). No Redux.
- **React Aria Components** (headless) for overlay focus trap later.
  Style them as table objects, not dialogs.
- **CSS modules + custom properties** for tokens. Layout = CSS grid +
  container queries. No Tailwind, no component kit with chrome, no Framer
  Motion.
- **Zod** at the wire boundary (shared with protocol).

## Backend (`apps/server`)

Hono on a Cloudflare Worker (Better T Stack DX: plain `async fetch`). One
**Durable Object per room**, a native `cloudflare:workers` class with
hibernatable WebSockets (`acceptWebSocket`, `webSocketMessage`). Bound with
`Cloudflare.DurableObject<Room>("Room")` on the Worker `env`.

Effect DOs (`Cloudflare.DurableObject<Room>()("Room", Effect.gen…)`) only
work when the Worker is also Effect: Alchemy then wraps the class with
`DurableObjectBridge`, which supplies workerd `fetch`. A Hono worker calling
`env.ROOM.getByName(name).fetch(request)` against an Effect DO fails with
`Handler does not export a fetch() function`. See Alchemy’s
[async-worker DO bindings](https://alchemy.run/cloudflare/compute/durable-objects/#binding-in-an-async-worker).

Room DO = orchestration only: authz, apply intent, persist snapshot, fan
out per-seat facts. **No rules in the room.** DO storage holds the live
engine snapshot. D1 does not hold in-trick state.

Structured JSON logs: `roomId`, `attemptId`, `seq`, `playerId`. **Never
log hidden hands or legal-card sets.**

## Storage

**Drizzle + SQLite.** Prod **Cloudflare D1**. Alchemy applies migrations
from `packages/db/src/migrations` during deploy / `alchemy dev`.

| Data | Owner | Store |
| --- | --- | --- |
| Hands, tricks, tasks, legality | engine | DO memory + DO snapshot |
| Per-seat visibility / affordances | view-model | derived; not source of truth |
| Selected card, overlays, skip-anim | skin | client only |
| `PlayerId`, display name, session | auth | D1 + HTTP-only cookie |
| Room code, host, occupancy | server | DO + D1 index for join |
| Connection dim/reconnect | server | DO, ephemeral |
| Campaign / logbook | later | D1 |

v1 D1 tables: Better Auth tables + `players` + `rooms` (code, host,
status). Auth is **Better Auth** anonymous/guest plugin. v1 is a guest
`PlayerId` that survives refresh. Email/OAuth only when campaign needs a
durable crew. Sessions are cookies, not tokens in logs or `localStorage`.

## Import graph (enforced in CI)

```text
engine       → protocol
view-model   → protocol, engine          (@crew/view-model/project)
db           → (nothing in the game graph)
web          → protocol
server       → protocol, db, auth
```

- Do not deep-import another package’s `src/`.
- New package: name, owner, allowed dependents, one-paragraph why — here
  and in the cruiser graph.

## Tools

- **Biome** — lint + format, one tool.
- **Vitest** — unit tests. Engine tests are the rules oracle.
- **Playwright** job stub — playground smoke in `phone-portrait` and
  `desktop` frames; real scene fixtures come later.
- **TypeScript** `strict`. **Knip** for dead exports. **dependency-cruiser**
  for the import graph.
- `@t3-oss/env-core` for web env. No git hooks; `nub run check` + CI are
  the gate (jj workspaces and hooks fight).

## Host + CI

**Host:** Cloudflare. Web → Pages (Alchemy Vite website). Server → Workers
+ Durable Objects + D1. Not Vercel for the play path. No Docker in v1.

**CI (GitHub Actions), every PR:** `nub run check` = format, lint,
typecheck, Knip, dependency-cruiser, unit tests. Playwright smoke may skip
until playground fixtures exist. Preview deploy after green (needs
Cloudflare secrets).

**Local:**

```text
nub install
nub run dev      web + worker via alchemy; playground echo WS, no room
nub run check    same gates as CI
nub run test     engine/protocol/view-model/server unit tests (stubs ok)
```

Two browser profiles against one room code is the multi-seat check once
rooms exist; for this task, health + playground route + echo WS is enough.
