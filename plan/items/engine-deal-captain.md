---
id: engine-deal-captain
type: task
status: blocked
title: Deal and captain
summary: Deal 3–5 players and reveal the captain (submarine 4).
parent: mil-engine
blocked_by:
  - engine-model
discovered_from:
  - mil-rules-guide
relates:
  - engine-trick
workspace: ""
change_ids: []
bookmark: ""
---

Deal 3–5 players and reveal the captain.

`GAME.md` §6, §4.3: shuffle 40, deal as evenly as possible. 4p → 10 each;
5p → 8; 3p → one extra card and one undealt card after the last full trick
(`PRESENTATION.md` region `undealt`). Holder of submarine 4 is captain:
first task in normal draft, leads first trick, resolves captain-only mission
flags later.

Acceptance: deal is even; 3p leftover exists; `captainSeat` is known after
deal; engine still emits facts, it does not animate the deal.
