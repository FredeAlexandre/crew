---
id: skin-geometry
type: task
status: blocked
title: Geometry skin
summary: "Placeholder skin skins/geometry: regions, cards, tokens. No ocean art."
parent: mil-skin
blocked_by:
  - view-fixtures
discovered_from:
  - mil-presentation-contract
relates:
  - skin-playground
workspace: ""
change_ids: []
bookmark: ""
---

Placeholder skin `skins/geometry`: regions, cards, tokens. No ocean art.

`PRESENTATION.md` §6, §14: named regions only (`seat.self`, `seat.n`,
`trick`, `hand`, `tasks.*`, `chrome`, `undealt`, `overlay`). Dark neutral
table, one accent for turn/legal; SVG cards with value + suit mark;
submarine is a distinct shape, not a fifth color-that-looks-like-a-suit.
Captain badge, sonar disc, distress chip. Empty slots keep layout (missing
captain leaves a hole).

Acceptance: play three tricks on a 360px phone and on desktop without
explaining whose turn or which cards are legal. Technique budget §13
(DOM + CSS, no per-card PNG set).
