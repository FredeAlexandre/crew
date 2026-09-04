# Crew

Digital *The Crew: Mission Deep Sea*. Engine + tests
(`packages/engine`) are the rules oracle. `FEATURES.md` is shipped
player-facing behavior to keep working.

Unimplemented official rules are GitHub issues under
[#7](https://github.com/FredeAlexandre/crew/issues/7). Do not recreate
a rulebook file.

## Commands

```text
nub run worktree:setup  # deps + local .env
nub run dev             # Alchemy: web :3001, worker :3000
nub run check           # biome, tsc, knip, cruiser, unit tests
nub run test
```

Use **nub** (`nub run`, `nubx`), not pnpm. Web UI is Tailwind + shadcn (Aria) in `apps/web`.

Engine code must run in Vitest, Node, and Cloudflare Workers — no `node:fs`,
no DOM. `apps/web` must not import `@crew/engine`.

Do not recreate `plan/` or a task board. Intent stays with the human.
When player-visible behavior changes, update `FEATURES.md` in the same
voice (result, not implementation).
