# Crew

A playable digital *The Crew: Mission Deep Sea*. Rules in `GAME.md`,
screen contract in `PRESENTATION.md`, stack in `documentation/stack.md`.

## Setup

Nub is the package manager and runner. Do not use pnpm.

```bash
nub install
cp apps/server/.env.example apps/server/.env
cp apps/web/.env.example apps/web/.env
```

Put a 32-byte secret in `apps/server/.env` as `BETTER_AUTH_SECRET`. Then:

```bash
nub run db:generate   # after schema changes
nub run dev           # Alchemy: web http://localhost:3001, worker http://localhost:3000
nub run check
nub run test
```

`nub run dev` starts Vite + the Hono worker + D1 + the Room Durable Object.
The playground route renders a hello fixture with no room. Boot can mint a
guest cookie. Playground echo WS hits `/room/:name`.

Deploy: `cd packages/infra && nubx alchemy login --configure`, then
`nub run deploy`. Destroy with `nub run destroy`.
