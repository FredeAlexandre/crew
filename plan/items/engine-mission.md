---
id: engine-mission
type: task
status: blocked
title: Mission attempt
summary: One mission attempt as a fact stream, including win and fail.
parent: mil-engine
blocked_by:
  - engine-tasks
  - engine-comms
discovered_from:
  - mil-rules-guide
  - mil-presentation-contract
relates:
  - v1-table-flow
workspace: ""
change_ids: []
bookmark: ""
---

One mission attempt as a fact stream, including win and fail.

Lifecycle from `GAME.md` §10, §14 and events from `PRESENTATION.md` §10:
briefing → deal → task draft → optional distress → play (sonar / last trick)
→ result. Every event carries `attemptId` and monotonic `seq`. Win when all
required tasks and mission conditions are complete; fail as soon as one is
impossible or cards run out incomplete. Retry: redeal, reset sonar; same
tasks or new draw. Engine never `await`s the skin.

Acceptance: a headless attempt can run to win or fail; reconnect can apply
the latest snapshot and ignore stale `seq`.
