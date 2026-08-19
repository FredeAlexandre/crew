---
id: v1-reconnect
type: task
status: blocked
title: Reconnect
summary: "Reconnect by room.snapshot: hard-apply the latest view model, drop animation backlog."
parent: mil-v1
blocked_by:
  - v1-table-flow
discovered_from:
  - mil-presentation-contract
relates:
  - engine-mission
  - skin-motion-sound
workspace: ""
change_ids: []
bookmark: ""
---

Reconnect by `room.snapshot`: hard-apply the latest view model, drop
animation backlog.

`PRESENTATION.md` §3.4, §10.1, §16. Events include `attemptId` and `seq` so
stale motion is ignored. `player.connection` dims a seat, does not remove
it. `deal` can jump to dealt hands.

Acceptance: kill a client mid-trick, restore seat, table matches others
without replaying the deal.
