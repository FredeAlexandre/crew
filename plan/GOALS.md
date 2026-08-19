# Goals

A playable digital *The Crew: Mission Deep Sea* for 3–5 people at one table.
Cooperative trick-taking: the crew shares tasks, almost cannot talk about hidden
hands, and wins or loses together. See `GAME.md`.

Three layers stay separate. The engine knows rules, not pixels. The skin knows
regions, motion, and sound, not legality. The view model is the only translation.
Names, regions, and event shapes live in `PRESENTATION.md`. If that file and
`GAME.md` disagree about what is legal, `GAME.md` wins. If they disagree about
what the screen shows, `PRESENTATION.md` wins.

**v1** proves a real table: lobby through result, sonar, last-trick peek,
distress, geometric skin, phone and desktop, reconnect by snapshot. Campaign
beauty, two-player Tonoja, spectators, and illustrated art are after v1.
Mission logbook modifiers are flags on the existing scenes, not new scenes.

The board under `plan/items/` is the checklist. This file is only the north star.
