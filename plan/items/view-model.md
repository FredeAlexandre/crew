---
id: view-model
type: task
status: ready
title: View-model types
summary: View-model types and projection from engine facts plus viewerSeat.
parent: mil-view-model
blocked_by: []
discovered_from:
  - mil-presentation-contract
relates:
  - engine-model
workspace: ""
change_ids: []
bookmark: ""
---

View-model types and projection from engine facts + `viewerSeat`.

Responsibilities (`PRESENTATION.md` §3.2, §9): hide other hands (count only);
mark which of *my* cards are legal; rotate seats so the viewer is always
`seat.self`; public trick, tasks, sonar faces, last trick; affordances
(`canPlay`, `canSonar`, `canTakeTask`, `canPassTask`, `canToggleDistress`,
…). Cheating is a view-model bug. Legal-card highlights and “why illegal”
are self-only.

Acceptance: types named to the contract; given a snapshot + seat, two
viewers never see each other’s hands. Can start from the contract before
the engine is wired; keep IDs aligned with `engine-model`.
