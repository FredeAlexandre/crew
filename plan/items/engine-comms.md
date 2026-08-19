---
id: engine-comms
type: task
status: blocked
title: Sonar and distress
summary: Sonar communication and distress passing.
parent: mil-engine
blocked_by:
  - engine-tasks
discovered_from:
  - mil-rules-guide
relates:
  - v1-overlays
workspace: ""
change_ids: []
bookmark: ""
---

Sonar communication and distress passing.

Sonar (`GAME.md` §9): after all tasks assigned; never during a trick; normally
once per player per attempt; one **color** card; token `highest | only | lowest`
must be true at communicate time; never a submarine; card stays in hand.
Distress (`GAME.md` §15): after tasks, before any sonar; skip or activate;
one direction for everyone; pass exactly one non-submarine card.

Acceptance: illegal sonar combinations cannot be confirmed; distress is
all-or-nothing; no hidden-hand table talk is modeled as an engine action
(discussion flags are mission modifiers later).
