---
id: skin-motion-sound
type: task
status: blocked
title: Motion and sound
summary: Motion budget and v1 audio sprite.
parent: mil-skin
blocked_by:
  - skin-geometry
discovered_from:
  - mil-presentation-contract
relates: []
workspace: ""
change_ids: []
bookmark: ""
---

Motion budget and v1 audio sprite.

`PRESENTATION.md` §11–12: durations `instant` … `hero` with caps (≤8 cards
moving, one hero at a time). Ease-out, no bounce. Input is never blocked on
animation. Reduced motion → duration 0. Nine cues: `sfx.deal`, `play`,
`trickWin`, `taskDone`, `sonar`, `illegal`, `confirm`, `missionWin`,
`missionFail`. No bed music during `play`. Mute persisted.

Acceptance: reconnect and skip-animations catch up by applying the latest
view model; no animation backlog.
