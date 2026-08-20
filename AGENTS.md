# Crew

Digital *The Crew: Mission Deep Sea*. Read `GAME.md` for rules,
`PRESENTATION.md` for the screen contract, `documentation/stack.md` for
where code lives.

## Commands

```text
nub install
nub run dev      # Alchemy: web :3001, worker :3000
nub run check    # biome, tsc, knip, cruiser, unit tests
nub run test
```

Use **nub** (`nub run`, `nubx`), not pnpm. Do not add Tailwind or shadcn.

Engine code must run in Vitest, Node, and Cloudflare Workers — no `node:fs`,
no DOM. `apps/web` must not import `@crew/engine`.

Do not recreate `plan/` or a task board. Intent stays with the human.
