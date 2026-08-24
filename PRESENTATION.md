# Presentation Contract

**Status:** draft 0.1 — decisions, not assets  
**Pair document:** `GAME.md` (rules). If this file and `GAME.md` disagree about *what is legal*, `GAME.md` wins. If they disagree about *what the screen shows*, this file wins.

This is the shared language between the technical track (engine, rooms, sync) and the aesthetic track (skin, motion, sound). Either side may change internals. Neither side changes names, regions, or event shapes without updating this document.

---

## 1. Purpose

A playable digital Crew needs three layers:

```text
Engine          authoritative facts (deal, turns, legality, win/lose)
View model      what *this client* is allowed to see
Skin            how those facts look, move, and sound
```

This contract is the boundary. The engine never mentions pixels. The skin never invents rules. The view model is the translation.

A geometric placeholder skin that honors this contract is a valid product. Illustration, custom glyphs, and extra juice are later skins, not a rewrite.

---

## 2. Visual constitution

Taste constraints. If a proposal fights these, it is probably wrong for this game.

- **Quiet table, loud cards.** The table is negative space. Cards, tasks, and whose-turn are the only things that must shout.
- **Minimalist, not empty.** Every mark on screen is information: suit, value, owner, legality, completion. Decoration that does not inform is noise.
- **Physical, not webby.** This is a table, not a dashboard. Avoid chrome that looks like a settings page. Overlays should feel like an object placed on the table (sonar token on a card), not a Bootstrap modal.
- **Readable in three seconds.** A new player glancing at the phone should see: whose turn, their hand, the trick, their tasks, whether they still have sonar.
- **One accent, four suits, one trump.** Color is reserved for suits and a single UI accent (turn / legal play). Do not invent a fifth decorative palette.
- **Motion is weight, not bounce.** Cards travel, land, and settle. No elastic overshoot on every action. Rare moments (mission win/fail) may be more expressive.
- **Silence is part of the sound design.** This is a thinking game. Do not loop music under play. Sound marks events; it does not fill air.
- **Accessible by construction.** Contrast over atmosphere. Suit is **color + symbol**, never color alone. Hit targets are thumb-sized even when the card art is smaller.

Skin work is judged against this list before it is judged as “pretty.”

---

## 3. How the tracks meet

### 3.1 Engine

Pure rules. No DOM, no CSS, no audio.

It emits **facts** in order. It does not wait for animations. It does not know who is “at the bottom of the screen.”

### 3.2 View model

Built per client from engine state + `viewerSeat`.

Responsibilities:

- hide other players’ hands (show count only)
- mark which of *my* cards are legal right now
- rotate seats so the viewer is always in region `seat.self`
- expose public table information (trick, tasks, sonar faces, last trick)
- expose action affordances (`canPlay`, `canSonar`, `canTakeTask`, `canPassTask`, `canRetry`, `canFillBots`, `canConfigure`, …)
- result actions: `canRetry` is true only for the host; Retry sends `host.retry` (same mission, new deal). Same-tasks and next-mission are later.
- lobby: `canFillBots` is true only for the seated host while empty chairs remain. Fill sends `host.fillBots` (ready dummy seats for solo testing). `canConfigure` is true only for the seated host. Configure sends `host.configure` with the mission difficulty (task-point total, 1–16) and a designated captain seat or `null` for a random deal. The lobby view shows the current difficulty on `chrome.difficulty` and previews a designated captain with `isCaptain`. Start still sends `host.start`; the room applies the stored setup. The physical rule is unchanged: the captain is the holder of submarine 4. A designated seat is dealt that card.

The view model is the API the skin binds to. If the skin needs a new piece of information, add it here, not by peeking into the engine.

### 3.3 Skin

Maps view-model state and named events onto regions, motion, and sound.

A skin is swappable: `skins/geometry` (default), later `skins/deep-sea`, etc. Skins may change assets, timing curves, and SFX. They may not change event names or region names.

### 3.4 Timing rule (non-negotiable)

The engine never `await`s a transition.

```text
engine emits card.played
    → skin plays 220ms of motion
    → if the next fact arrives early, skin queues or skips
    → prefers-reduced-motion ⇒ duration 0, tiny opacity fade optional
```

Juice is a client luxury. Reconnect, fast opponents, and “skip animations” must always be able to catch up by jumping to the latest view model.

---

## 4. Identity (stable IDs)

Use these names in code, fixtures, and events.

| ID | Meaning |
|---|---|
| `SeatId` | `0 … playerCount-1`, clockwise around the table, assigned at sit-down. Not “bottom of the screen.” |
| `PlayerId` | Durable identity (account or guest). A seat can be empty; a player can reconnect into a seat. |
| `CardId` | One of the 40 playing cards. Stable across reshuffles of *identity*; position in a hand is not the id. |
| `TaskId` | Identity of a task card in the 96-card set. |
| `TaskInstanceId` | This mission attempt’s copy of a task (drawn, maybe replaced). |
| `MissionId` | Logbook mission number. |
| `AttemptId` | One deal / try at a mission. |
| `TrickId` | Index of the current trick in the attempt, starting at 1. |

**Suit IDs** (engine, not hex colors):

```text
pink | yellow | green | blue | submarine
```

Pink / yellow / green / blue are the four color suits from the physical game. The skin maps each to a color *and* a distinct symbol. Submarine is trump, never a color suit.

**Card value:** color cards `1–9`, submarine `1–4`.

**Sonar position:** `highest | only | lowest` (token on top / middle / bottom of the revealed card).

---

## 5. Scenes

A **scene** is a full-table mode. An **overlay** sits on the current scene and must not replace the table (the player still needs to see seats, tasks, and hand context).

| Name | Kind | Job |
|---|---|---|
| `boot` | scene | Connect, restore seat, show a table-shaped skeleton immediately. |
| `lobby` | scene | 3–5 seats, names, ready, host starts. Empty seats are visible holes. |
| `briefing` | scene | Current mission: number, title/summary, difficulty, special rules. Confirm to deal. |
| `deal` | scene | Cards fly to seats. Captain token appears when submarine 4 is known to that client. |
| `taskDraft` | scene | Face-up tasks in the center. Clockwise take/pass. Sonar disabled. |
| `play` | scene | The mission. Default state of the product. |
| `result` | scene | Success or failure. Retry / same tasks / new tasks / next mission. |
| `campaign` | scene | Logbook: which missions are done, attempt counts, distress used. |
| `sonar` | overlay | Choose a legal color card and a token position. Table remains visible. |
| `distress` | overlay | After tasks, before first sonar: activate or skip; if on, pick left/right, then pick a non-submarine card to pass. |
| `lastTrick` | overlay | Peek at the most recently completed trick (normally the only one that may be inspected). |
| `reminder` | overlay | Optional: follow-suit / sonar / trump cheat-sheet. Not a website help page — a compact reminder card. |

`trickResolve` is **not** a scene. It is a short moment inside `play` (winning card marked, cards collected to the winner’s won-trick pile, tasks ticking).

Mission-specific rules may add *behavior* (who may take tasks, extra constraints) but should reuse these scenes. A mission that needs a genuinely new scene is a contract change.

**v1 may skip** `campaign` polish and the two-player Tonoja layout. Seats 3–5 and the scenes above are the product.

### 5.1 Scene flow

```text
boot → lobby → briefing → deal → taskDraft → [distress?] → play ⇄ sonar
                                                          play ⇄ lastTrick
                                                          play → result → briefing | campaign | lobby
```

`deal` can be skipped visually (jump to dealt hands) on reconnect or reduced motion. The engine is already in “hands dealt.”

---

## 6. Regions

Named slots. Layouts change *where* they sit, not *what they are called*. Skins draw inside them. Do not add a one-off `div` for “that thing in the corner” — add a region or place it in an existing one.

| Region | Contains |
|---|---|
| `seat.self` | Local player: captain token if theirs, sonar token, won-trick count, communicated card if any. |
| `seat.n` | Each opponent, clockwise from self as `n = 1 .. playerCount-1`. Same contents, hand hidden (count only). |
| `trick` | Cards of the current trick, in play order, led card marked. Empty between tricks except during collection animation. |
| `hand` | Local player’s cards. Legal / illegal / selected / communicated-but-still-in-hand. |
| `tasks.center` | Unassigned tasks during `taskDraft`. Empty during play. |
| `tasks.self` | Local player’s assigned tasks, face up or completed (face down). |
| `tasks.n` | Opponent tasks, same rules, always public. |
| `chrome` | Mission number, trick number, whose turn, distress state, “sonar available.” Compact. |
| `undealt` | The leftover card in a 3-player deal (unplayed at the end). Hidden or face-down per rules; region exists so layout does not jump. |
| `overlay` | Sonar, distress, last trick, reminder, reconnect banner. One overlay at a time unless reconnect (banner may stack). |

**App shell (not a table region).** Account identity is a persistent avatar disc in the SPA shell (top-right; “Table” home link on the left when you are at a lobby). It is **not** `chrome`, **not** `seat.self`, and **not** the lobby chair notch. Opening it shows a table-object sheet (React Aria dialog): guests may **create an account** on this same `PlayerId`, or **sign in** to an existing one (guest name / hosted tables merge onto that account, then the anonymous user is deleted). Creating or signing in does **not** reserve a lobby seat. Profile photo, theme, SFX volume, and animation prefs may appear as stubs. Mute and skip-animations stay table chrome when they ship. Other players do not see this avatar on seats yet.

**Seat contents (every `seat.*`):**

- display name
- ready / connected / disconnected
- captain token (or empty slot of the same size)
- sonar token: `available` (green) / `used` / `communicating`
- won-trick pile: a compact count; the pile is tappable to request `lastTrick` only for the latest trick owner as rules allow
- communicated card slot (public): card + sonar position, or empty
- hand count (opponents) or nothing extra (self uses `hand`)

Keep empty slots. A missing captain token should leave a hole, not reflow the seat.

---

## 7. Layouts

Same regions, three compositions. Breakpoints are *layout modes*, not “hide the hand on mobile.”

Use container queries on the table, not only viewport width — the table may live in a desktop column.

| Mode | When | Composition |
|---|---|---|
| `phone-portrait` | narrow, tall | `seat.*` opponents in a **top strip** (faces/tokens, not a surround). `chrome` under that. `trick` + `tasks.*` in the middle. `hand` a **horizontal strip** at the bottom. `seat.self` tokens sit on the hand’s top edge (sonar, captain). |
| `tablet` / `phone-landscape` | medium or wide-short | Opponents **around** `trick`. `hand` a shallow fan or overlapping row. Tasks near each seat, not a second dashboard. |
| `desktop` | wide | Same as landscape table, more margin. Keyboard enabled. Pointer hover may lift a card; hover is never required to play. |

### 7.1 Layout rules

- **Self is always bottom.** The view model rotates seats. The skin never special-cases “player 3 is me.”
- **The trick is the anchor.** All layouts grow out from `trick`. If something must shrink, shrink won-trick piles and chrome first, never the current trick or the legal cards in hand below readability.
- **Hand on phone is a strip, not a full arc.** A deep fan wastes vertical space and makes the last cards untappable. Slight overlap is allowed; the focused/selected card comes to the front and gets a ≥44px hit target.
- **Tasks stay near their owner** in `tablet`/`desktop`. On `phone-portrait`, opponent tasks may collapse to icons in the top strip, expandable. Local tasks stay visible above the hand — you must see what *you* still owe.
- **Safe areas.** `hand` and primary actions sit above home-indicator / gesture insets. No critical tap target in the last 12–16px of the screen.
- **Landscape on phones is first-class**, not an afterthought. Many people will play a card game that way. Do not lock orientation in v1.
- **Minimum supported frame:** 360×640. If it works there, it works on a small phone. Desktop is 1280×800 as the other reference frame.

### 7.2 What must never depend on layout

- Event names and payloads
- Which cards are legal
- Who is captain
- Overlay *meaning* (sonar is sonar even if it is full-width on a phone)

---

## 8. Input

Pointer-first. Keyboard is an enhancement on `desktop`. Touch and mouse go through the same pointer model.

### 8.1 Play a card

Misplays are costly. Default is **select, then confirm**.

| Device | Select | Play |
|---|---|---|
| Touch | Tap a legal card (it lifts). Tap another to change selection. | Tap the selected card again, **or** tap `Play`. |
| Mouse | Click to select. | Click again, **or** Enter / `Play`. |
| Keyboard | Left/Right (or `H`/`L`) move selection among *legal* cards first, then illegal. | Enter / Space plays if legal. |

Illegal cards are visible but muted. Selecting one shows *why* (e.g. “Must follow green”). Playing it is impossible.

Optional later: “tap-to-play” for experts. Not the default.

### 8.2 Other actions

- **Take task:** tap the task in `tasks.center` when it is your draft turn. Confirm only if the task is an unusually heavy commitment (leave this for playtest; default is one tap).
- **Pass** (when legal): a `Pass` control in `chrome` or `seat.self`, never hidden in a menu.
- **Sonar:** a control on `seat.self` when `canSonar`. Opens overlay; pick card from hand (legal communicate-candidates highlighted), then pick `highest | only | lowest`. Invalid combinations cannot be confirmed.
- **Distress:** offered as overlay after draft; skip is as obvious as activate.
- **Last trick:** tap the relevant won-trick pile.
- **Ready / start:** lobby controls, large enough for thumbs. Host-only difficulty stepper and captain picks live in the lobby well, not a settings page.

### 8.3 Keyboard map (`desktop`)

| Key | Action |
|---|---|
| `←` `→` | Move hand selection |
| `Enter` `Space` | Confirm (play / take / sonar step) |
| `Esc` | Close overlay without committing |
| `S` | Open sonar if legal |
| `L` | Last trick |
| `R` | Reminder |
| `1–9` | Jump to a card of that value in hand if unique and legal; otherwise only select, do not play |

Do not steal browser shortcuts (`Ctrl/Cmd+R`, tab, etc.).

### 8.4 Targets and focus

- Minimum hit target **44×44 CSS px**. Visual card may be smaller; the tap rect may extend into overlap.
- Visible focus ring for keyboard users, using the UI accent, not the browser default outline only.
- No hover-only information. Anything hover reveals must also be available on tap (title / why-illegal).

---

## 9. Visibility

What a client may render. Cheating is a view-model bug.

| Data | Self | Others | Spectators (later) |
|---|---|---|---|
| Own hand | Full | Count only | Count only |
| Communicated card + sonar position | Public | Public | Public |
| Current trick | Public | Public | Public |
| Assigned tasks | Public | Public | Public |
| Completed tasks (face down) | Public as complete | Public as complete | Same |
| Sonar available/used | Public | Public | Public |
| Captain | Public | Public | Public |
| Won-trick count | Public | Public | Public |
| Last completed trick contents | Public on peek | Public on peek | Public on peek |
| Older tricks | Hidden (count only) | Hidden | Hidden |
| Legal-card highlights | Self only | No | No |
| “Why illegal” | Self only | No | No |
| Task-draft “I want this because…” | Never | Never | Never |

During `deal`, cards are face down until they land in `hand` (self) or join an opponent’s count. Captain identity becomes public when submarine 4 has been dealt (each player sees their own cards; the captain is known once the holder can act — the engine should expose `captainSeat` as soon as it is determined, which is after the deal).

Reminder cards (physical hand-size dummy) are **not** shown as extra cards in `hand`. Digitally, the communicated card stays in `hand` *and* is copied in the seat’s communicated slot. That is clearer than the cardboard dummy. The reminder overlay is help text, not a fake card.

---

## 10. Events

The skin listens to these names. Payloads are facts, not CSS.

Group by phase. All events include `attemptId` and a monotonic `seq` so the skin can ignore stale animations after reconnect.

### 10.1 Table life

| Event | Payload (minimum) | Typical juice |
|---|---|---|
| `room.snapshot` | full view model | no motion; hard apply |
| `player.sat` | `seatId`, `playerId`, name | seat fills |
| `player.stood` | `seatId` | seat empties |
| `player.ready` | `seatId`, ready | token/check |
| `player.connection` | `seatId`, `connected` | dim seat, do not remove |
| `host.configured` | `difficulty`, `captainSeat` | lobby setup updates |
| `host.started` | `missionId` | leave lobby |

### 10.2 Mission setup

| Event | Payload | Typical juice |
|---|---|---|
| `mission.briefed` | `missionId`, difficulty, special-rule flags | briefing scene |
| `card.dealt` | `cardId?` (only if viewer receives it), `seatId`, `index`, `handCount` | stagger into seat/hand |
| `captain.revealed` | `seatId` | token moves to seat |
| `tasks.drawn` | list of `TaskInstanceId` + public task data | cards appear in `tasks.center` |
| `task.offeredTurn` | `seatId` | that seat highlighted |
| `task.taken` | `taskInstanceId`, `seatId` | task travels to `tasks.n` |
| `task.passed` | `seatId` | small deny tick |
| `task.replaced` | old/new instance (impossible combo) | swap in center |
| `draft.completed` | — | center empties |

### 10.3 Distress

| Event | Payload | Typical juice |
|---|---|---|
| `distress.offered` | — | overlay |
| `distress.skipped` | — | overlay closes |
| `distress.activated` | `direction: left \| right` | token flips to active |
| `card.passed` | `fromSeat`, `toSeat`, `cardId?` (only if viewer sent or received) | card slides to neighbor |

### 10.4 Play

| Event | Payload | Typical juice |
|---|---|---|
| `turn.started` | `seatId`, `trickId`, `ledSuit?` | seat accent, chrome update |
| `card.played` | `seatId`, `cardId`, `trickOrder` | card to `trick` |
| `trick.resolved` | `trickId`, `winnerSeat`, card ids, `ledSuit` | winner marked, cards collect |
| `task.progressed` | `taskInstanceId`, state | subtle pulse |
| `task.completed` | `taskInstanceId`, `seatId` | flip face down |
| `task.failed` | `taskInstanceId`, reason code | fail mark, then `mission.failed` |
| `sonar.opened` | `seatId` (self) | overlay |
| `sonar.used` | `seatId`, `cardId`, `position` | card appears in seat slot, token moves |
| `sonar.cleared` | `seatId` | slot empties when that card is later played |
| `lastTrick.shown` | cards, `winnerSeat` | overlay |
| `mission.won` | `missionId`, `attemptId` | result scene |
| `mission.failed` | `missionId`, `attemptId`, reason | result scene |

### 10.5 Skin-only (optional, not emitted by engine)

The skin may synthesize:

- `ui.selectCard` / `ui.deselectCard`
- `ui.illegalHint`
- `ui.animationSkipped`

Do not send these over the network.

---

## 11. Motion budget

Default language of movement. Skins may retune numbers; they should not exceed the **caps**.

| Token | Duration | Use |
|---|---|---|
| `instant` | 0 ms | reduced motion, reconnect, skip |
| `tick` | 80–120 ms | sonar pip, ready, illegal nudge |
| `move` | 180–280 ms | card hand → trick, task center → seat |
| `collect` | 220–320 ms | trick → winner pile |
| `flip` | 250–350 ms | task complete |
| `deal-stagger` | 30–45 ms between cards | deal only |
| `hero` | 800–1600 ms | mission win/fail only |

**Caps**

- At most **8** cards moving at once. Deal the rest in waves.
- At most **one** `hero` animation at a time.
- No animation on the critical path of input: the next legal action is clickable as soon as the view model says so, even if the previous card is still sliding. If that feels messy, shorten `move`; do not block input.
- `prefers-reduced-motion: reduce` maps everything to `instant` plus optional 80 ms opacity. Still play a single short SFX on `mission.won` / `mission.failed` unless the user muted audio.

**Easing:** decelerate into place (`ease-out`). No bounce. Trick-win may use a 1.04 scale pulse on the winning card for 180 ms.

**Skip:** a persistent control “skip animations” (and skip on tap-during-deal). Fast groups will use it.

---

## 12. Sound constitution

Audio is an event layer, not ambience.

| Principle | Meaning |
|---|---|
 | Sparse | One-shots on facts. No bed music during `play`. Lobby/result may have a very quiet bed that ducks to silence when `play` starts. |
| Short | Most SFX ≤ 200 ms. Hero stingers ≤ 1.5 s. |
| One sprite | Pack v1 SFX into a single audio sprite (one download, instant overlap control). |
| Mute | Chrome control, persisted. Default *on* for desktop, follow OS silent-mode if we can detect it on mobile; never surprise-unmute. |
| Table vs UI | Table sounds (deal, play, trick) are slightly “material.” UI sounds (button, illegal) are drier. Do not use the same tick for both. |

**v1 cue list** (names = contract; files = skin):

| Cue | Fires with |
|---|---|
| `sfx.deal` | each `card.dealt` (or every Nth if that is too dense — skin choice, cap ~12/s) |
| `sfx.play` | `card.played` |
| `sfx.trickWin` | `trick.resolved` |
| `sfx.taskDone` | `task.completed` |
| `sfx.sonar` | `sonar.used` |
| `sfx.illegal` | `ui.illegalHint` |
| `sfx.confirm` | task taken, distress confirmed |
| `sfx.missionWin` | `mission.won` |
| `sfx.missionFail` | `mission.failed` |

No voice lines. No radio chatter. Cooperative thinking dies under chatter.

---

## 13. Technique budget

Choose the cheapest method that reads as physical. Change technique only when the moment is rare or the cheaper method fails.

| Moment | v1 technique | Avoid |
|---|---|---|
| Layout of regions | CSS grid + container queries | JS measuring every frame |
| Card faces | Inline SVG (color field, value, suit mark) | Photo scans of the boxed game; per-card PNG sets |
| Card move / deal | CSS `transform` + `transition` on a compositor layer | `top`/`left` animation; per-frame JS |
| Legal / selected | CSS outline / lift (`translateY`) | Drop-shadow trees on every card |
| Task complete | CSS flip or a face-down swap | Particle burst |
| Sonar | Token element + `tick` scale; SFX | Screen-wide ripple every time |
| Table atmosphere | Flat (or barely graded) field | Looping video, heavy `backdrop-filter` |
| Mission result | Typography + `hero` motion; optional later WebM/Lottie | Full-screen canvas |
| Won-trick pile | Count + one stacked silhouette | Rendering every captured card |

**Implementation notes**

- Prefer **DOM + CSS** for this game. It is a table of discrete objects, not a shooter. Canvas/WebGL only if a later skin proves a single effect that CSS cannot do.
- Cards are **not** a sprite atlas in v1. SVG scales on all DPIs and keeps the first payload tiny.
- Do not run 40 independent JS tweens. Stagger CSS; if the tab is backgrounded, jump to snapshot on return (`document.visibilityState`).

---

## 14. Placeholder skin (`skins/geometry`)

Ship this first. It is allowed to look “designed geometric,” not ugly-on-purpose.

- Table: dark neutral field, one accent for turn/legal.
- Cards: rounded rect, big value, suit mark, suit-colored edge or fill. Submarine: distinct shape (e.g. chevron / bar), not a fifth color-that-looks-like-a-suit.
- Tokens: captain = simple badge; sonar = disc with three possible positions drawn as a slider on the communicated card; distress = two-sided chip.
- Type: one UI face, tabular numbers on cards. No display type until result/briefing.
- No ocean illustration, no wood grain, no logo lockup on every seat.

Acceptance test: play three tricks on a 360px-wide phone and on desktop **without** explaining the UI. If whose-turn or legal cards are unclear, the skin failed — do not add art.

---

## 15. Playground

Aesthetic work must not require a live 4-player room.

Maintain fixture snapshots of the view model, named by scene:

```text
fixtures/lobby.threeEmpty.json
fixtures/deal.mid.json
fixtures/taskDraft.captainChoosing.json
fixtures/play.midTrick.fourPlayers.json
fixtures/play.sonarAvailable.json
fixtures/play.twoTasksLeft.json
fixtures/result.fail.taskImpossible.json
```

The engine team owns fixture *validity* (a snapshot must be a possible view model). The skin team owns how it looks. The product lobby is a live room; these snapshots are for tests and CLI playgrounds, not a `?preview=` route.

---

## 16. v1 scope vs later

**v1 must prove**

- 3–5 seated players, one device each
- lobby → briefing → deal → draft → play → result
- sonar overlay and last-trick peek
- distress overlay (pass one card)
- geometric skin + motion budget + nine SFX cues
- phone portrait, phone landscape, desktop keyboard
- reconnect via `room.snapshot` (no animation backlog)

**Explicitly later (do not block v1)**

- Two-player Tonoja (needs extra regions: face-up/down columns)
- Spectators
- Campaign logbook as a beautiful scene (a simple list is enough at first)
- Illustrated card faces, Lottie/WebM heroes, table atmosphere
- Expert tap-to-play, animation skip default
- Voice/video (out of product taste: this game wants table silence)
- Pixel-perfect clone of KOSMOS art (legal and aesthetic trap)

Mission-specific logbook modifiers land as **flags on the view model** (`sonarDisabled`, `discussionAllowed`, `taskDraftVariant`, …) rendered with the same scenes. New flags are small contract additions; new scenes are large ones.

---

## 17. Changing this contract

Allowed anytime, but it is a coordinated change:

1. Edit this file (names, regions, events, budgets).
2. Update view-model types and fixtures.
3. Update skins (at least `geometry`).
4. Then engine or network as needed.

Do **not** introduce a one-off CSS class or socket message that is not named here. That is how the tracks tangle.

Questions of taste (timing, glyphs, copy, density) are resolved by playing the playground on a phone, not by extending the engine.

---

## 18. Open points (intentionally small)

Everything above is a proposed default. Only these are still forks worth a conversation before implementation:

1. **Task take: one tap vs confirm.** One tap is faster; confirm prevents a campaign-ruining misclick. Lean one-tap for v1, add confirm if playtests punish it.
2. **Communicated card duplication** (in hand + seat slot) vs physically moving the card out of the fan. Duplication is clearer digitally; moving it is more analog. Lean duplication.
3. **Phone: collapse opponent tasks** into the top strip. Necessary for height; risky for “I forgot she has the yellow-9 task.” Lean collapse with a persistent badge count per seat.

These do not block writing the engine or the playground. They only affect `taskDraft` / `play` layout details inside existing regions.
