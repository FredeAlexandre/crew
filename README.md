# Crew

A playable digital *The Crew: Mission Deep Sea*. Engine + tests are the
rules oracle (`packages/engine`). Screen contract in `PRESENTATION.md`,
shipped player behavior in `FEATURES.md`, stack in
`documentation/stack.md`. Remaining official rules:
[issues under #7](https://github.com/FredeAlexandre/crew/issues/7).

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
Boot mints a guest cookie. The shell avatar (and a Sign in control on
boot) can create an account on that guest or sign in to an existing
account. Sign-in merges guest name and hosted tables, then deletes the
anonymous user. An account does not reserve a lobby seat.
Playground echo ping still speaks echo and will fail until the web hook
is rewired.

Local and production do not share env files. `nub run dev` reads
`apps/server/.env` (localhost CORS). `nub run deploy` targets Alchemy stage
`prod` and reads `packages/infra/.env.prod`. Production state lives in
Cloudflare (`Cloudflare.state()`), not in `.alchemy/` on a laptop.

Pushes to `main` deploy production via GitHub Actions (after `nub run check`).
The site is `https://crew.aleno.casa`. Same-repo PRs deploy an isolated
preview at `https://crew-pr-{n}.aleno.casa` and tear it down when the
PR closes. Manual deploy from a laptop still works after
`cd packages/infra && nubx alchemy login --configure`:

```bash
cp packages/infra/.env.prod.example packages/infra/.env.prod
# CORS_ORIGIN=https://crew.aleno.casa and a dedicated BETTER_AUTH_SECRET.
nub run deploy
```

Actions needs these repository secrets/variables:

| Name | Kind | Purpose |
| --- | --- | --- |
| `CLOUDFLARE_API_TOKEN` | secret | Deploy Workers/D1/R2 and read the Alchemy state-store token. Must include **Secrets Store Write** (not just Read), plus Workers Scripts Write, D1 Write, Workers R2 Storage Write, Account Settings Write, Workers Routes Write, DNS Write, Workers Tail Read. |
| `CLOUDFLARE_ACCOUNT_ID` | secret | Cloudflare account |
| `BETTER_AUTH_SECRET` | secret | Production cookie signing (not the local `.env` value) |
| `PREVIEW_BETTER_AUTH_SECRET` | secret | Cookie signing for PR preview stages (not the prod secret) |
| `CORS_ORIGIN` | variable | `https://crew.aleno.casa` (prod only; previews compute their own) |

Create the API token at [Cloudflare API tokens](https://dash.cloudflare.com/profile/api-tokens), then `gh secret set CLOUDFLARE_API_TOKEN`. Destroy with `nub run destroy`.
