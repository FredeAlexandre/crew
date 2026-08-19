---
id: engine-model
type: task
status: blocked
title: Engine model
summary: Stable identities, 40-card deck, and attempt state. No play loop yet.
parent: mil-engine
blocked_by:
  - repo-setup
discovered_from:
  - mil-rules-guide
  - mil-presentation-contract
relates:
  - view-model
  - repo-setup
workspace: ""
change_ids: []
bookmark: ""
---

Stable identities, deck, and attempt state. No play loop yet.

IDs from `PRESENTATION.md` §4: `SeatId` 0…n-1 clockwise, `PlayerId`, `CardId`,
`TaskId`, `TaskInstanceId`, `MissionId`, `AttemptId`, `TrickId` from 1.
Suits: `pink | yellow | green | blue | submarine`. Color values 1–9,
submarine 1–4. Forty-card deck as in `GAME.md` §3–4.

Acceptance: construct a 3-, 4-, or 5-player attempt; enumerate the deck;
nothing here knows pixels.
