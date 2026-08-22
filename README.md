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
HTTP create/join mints a room code; WS `/room/:code` is the table host.
Boot can mint a guest cookie. Playground echo ping still speaks echo and will
fail until the web hook is rewired.

Local and production do not share env files. `nub run dev` reads
`apps/server/.env` (localhost CORS). `nub run deploy` targets Alchemy stage
`prod` and reads `packages/infra/.env.prod`.

Deploy: `cd packages/infra && nubx alchemy login --configure`, then:

```bash
cp packages/infra/.env.prod.example packages/infra/.env.prod
# Set CORS_ORIGIN to the production website origin and a dedicated secret.
nub run deploy
```

CI writes the same `.env.prod` keys from GitHub Actions secrets/variables.
Destroy with `nub run destroy`.
