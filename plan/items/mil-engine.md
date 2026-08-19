---
id: mil-engine
type: milestone
status: ready
title: Engine
summary: "Pure rules engine: deal, turns, legality, tasks, sonar, distress, win/lose."
parent: goal-playable-crew
blocked_by: []
discovered_from:
  - mil-rules-guide
  - mil-presentation-contract
relates:
  - mil-view-model
workspace: ""
change_ids: []
bookmark: ""
---

Pure rules engine: deal, turns, legality, tasks, sonar, distress, win/lose.

No DOM, CSS, or audio. Emits facts in order and never awaits a transition
(`PRESENTATION.md` §3.1, §3.4). Exit: one attempt can run 3–5 players from
deal through mission result, with events named as in `PRESENTATION.md` §10.
