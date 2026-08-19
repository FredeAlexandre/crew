---
id: mil-view-model
type: milestone
status: ready
title: View model
summary: "Per-client projection: what this viewer may see and which actions are legal."
parent: goal-decoupled-tracks
blocked_by: []
discovered_from:
  - mil-presentation-contract
relates:
  - mil-engine
  - mil-skin
workspace: ""
change_ids: []
bookmark: ""
---

Per-client view model: what *this* viewer may see and which actions are legal.

Built from engine state + `viewerSeat`. Hides other hands, marks legal cards,
rotates seats so the viewer is `seat.self`, exposes public table data and
affordances (`PRESENTATION.md` §3.2, §9). Exit: types plus named fixtures the
skin can bind without a live room.
