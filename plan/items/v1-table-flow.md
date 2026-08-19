---
id: v1-table-flow
type: task
status: blocked
title: Table flow
summary: "Wire scenes: boot → lobby → briefing → deal → taskDraft → play → result."
parent: mil-v1
blocked_by:
  - engine-mission
  - view-model
  - skin-geometry
discovered_from:
  - mil-presentation-contract
relates:
  - v1-overlays
workspace: ""
change_ids: []
bookmark: ""
---

Wire scenes: `boot → lobby → briefing → deal → taskDraft → play → result`.

`PRESENTATION.md` §5. 3–5 seats in lobby; empty seats are visible holes;
host starts. `deal` may skip visually on reconnect or reduced motion; the
engine is already dealt. `trickResolve` is a moment inside `play`, not a
scene. `campaign` may be a simple list.

Acceptance: a 3-player and a 4-player table can walk the flow on geometry
skin without missing a named scene.
