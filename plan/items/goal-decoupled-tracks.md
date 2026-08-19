---
id: goal-decoupled-tracks
type: goal
status: ready
title: Decoupled tracks
summary: Engine, view model, and skin stay separate tracks.
parent: ""
blocked_by: []
discovered_from: []
relates:
  - goal-playable-crew
workspace: ""
change_ids: []
bookmark: ""
---

Engine, view model, and skin stay separate tracks.

The engine never mentions pixels or awaits animations. The skin never invents
rules or event names. New information for the skin is added to the view model,
not by peeking into the engine. Changing names, regions, or events means
updating `PRESENTATION.md` first (`PRESENTATION.md` §3, §17).
