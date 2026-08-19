---
id: v1-layouts
type: task
status: blocked
title: Layouts
summary: "Three layout modes, same regions: phone-portrait, tablet/phone-landscape, desktop."
parent: mil-v1
blocked_by:
  - skin-geometry
discovered_from:
  - mil-presentation-contract
relates:
  - skin-playground
workspace: ""
change_ids: []
bookmark: ""
---

Three layout modes, same regions: `phone-portrait`, `tablet` /
`phone-landscape`, `desktop`.

`PRESENTATION.md` §7. Self is always bottom (view model rotates). Trick is
the anchor. Phone hand is a strip, not a deep fan. Opponent tasks collapse
on portrait with badge counts (`PRESENTATION.md` §18); local tasks stay
visible. Landscape on phones is first-class. Safe areas above home
indicator. Keyboard only in `desktop`.

Acceptance: 360×640 portrait and landscape plus 1280×800 desktop; no
critical target in the last 12–16px.
