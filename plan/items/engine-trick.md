---
id: engine-trick
type: task
status: blocked
title: Trick play
summary: "One trick: lead, follow suit, trump, winner, last completed trick."
parent: mil-engine
blocked_by:
  - engine-model
discovered_from:
  - mil-rules-guide
relates:
  - engine-deal-captain
workspace: ""
change_ids: []
bookmark: ""
---

One trick: lead, follow suit, trump, winner, last completed trick.

`GAME.md` §5: must follow led suit if able; without submarine, highest of led
suit wins; any submarine beats color; highest submarine wins if several.
Winner leads next. Only the most recently completed trick may be inspected
again. Never required to play highest or to win.

Acceptance: fixtures for color-only tricks, void-and-discard, and trump;
illegal plays rejected with a reason the view model can show (`GAME.md` §22
mistakes).
