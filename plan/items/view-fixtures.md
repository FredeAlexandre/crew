---
id: view-fixtures
type: task
status: blocked
title: View fixtures
summary: Named playground snapshots of the view model.
parent: mil-view-model
blocked_by:
  - view-model
discovered_from:
  - mil-presentation-contract
relates:
  - skin-playground
workspace: ""
change_ids: []
bookmark: ""
---

Named playground snapshots of the view model.

`PRESENTATION.md` §15: `fixtures/lobby.threeEmpty.json`, `deal.mid`,
`taskDraft.captainChoosing`, `play.midTrick.fourPlayers`,
`play.sonarAvailable`, `play.twoTasksLeft`, `result.fail.taskImpossible`,
and a recorded event list for motion (`card.played` × 4 → `trick.resolved`).

Acceptance: each snapshot is a possible view model (engine team owns
validity once the engine exists; until then, hand-authored but contract-
shaped). Skin can render without a live 4-player room.
