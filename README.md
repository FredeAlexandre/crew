<p align="center">
  <br>
  <br>
  <a href="https://crew.aleno.casa">
    <img alt="Crew logo" src=".github/assets/logo.svg" height="128">
  </a>
  <br>
  <br>
</p>
<br/>
<p align="center">
  <a href="https://crew.aleno.casa"><img src="https://img.shields.io/badge/play-crew.aleno.casa-e0c36a?style=flat" alt="Play"></a>
  <a href="https://github.com/FredeAlexandre/crew/actions/workflows/ci.yml"><img src="https://github.com/FredeAlexandre/crew/actions/workflows/ci.yml/badge.svg?branch=main" alt="CI"></a>
  <a href="https://github.com/FredeAlexandre/crew/issues/7"><img src="https://img.shields.io/badge/rules-in%20progress-6a9fd6?style=flat" alt="Official rules in progress"></a>
  <a href="FEATURES.md"><img src="https://img.shields.io/badge/features-player%20contract-6fb38a?style=flat" alt="Player features"></a>
</p>
<br/>

# Crew 🌊

A playable digital *The Crew: Mission Deep Sea* for 3–5 players. Engine + tests
are the rules oracle (`packages/engine`). Shipped player behavior lives in
[`FEATURES.md`](FEATURES.md). Remaining official rules:
[issues under #7](https://github.com/FredeAlexandre/crew/issues/7).

- 🪑 Sit 3–5 players around a table — create a lobby or join with a short code
- 🃏 Deal a real mission: task draft, distress, sonar, and tricks
- 🤖 Fill empty seats with dummy teammates
- 🌍 Play in French, Spanish, or English
- 🙈 Hands stay hidden — you only see counts, tasks, and sonar
- 📜 Signed-in players keep mission history

## Setup

Nub is the package manager and runner. Do not use pnpm.

```bash
nub run worktree:setup
```

That installs dependencies and writes local `.env` files. A new
`apps/server/.env` gets a generated `BETTER_AUTH_SECRET`. If this is a T3 Code
worktree and the primary project already has `.env` files, those are copied
instead. T3 Code runs the same command when it creates a worktree. Then:

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
