# Player features

What a person sitting at the table should be able to do today. Use this as a walkthrough: if a line no longer matches the product, either restore the behavior or rewrite the line.

This is not a technical changelog. The engine is the rulebook. This file is the **intended result** of shipped work. Unimplemented official rules live in [issues under #7](https://github.com/FredeAlexandre/crew/issues/7).

---

## Home

- [ ] Open the site and see **Play** and **Join** on a full-screen landing. No name, player count, or extra links on that screen.
- [ ] **Play** opens a 4-player table.
- [ ] **Join** asks for the short code or the lobby link, then sits you down.
- [ ] A bad code says there is no lobby with that code.
- [ ] A flag at the top-right (left of the face) is where language lives, even if you cannot read the rest of the page.
- [ ] The disc in the top-right opens profile, sign-in, settings, and **Browse assets**.

## Language

- [ ] Switch **FR / ES / EN** from the flag. The choice survives a reload.
- [ ] The whole site follows that language: home, lobby, table (tasks, illegal plays, turn, play/pass, trick hold, sonar, sound), result, profile, and Browse assets.

## Profile

- [ ] A disc in the top-right opens your profile. It is not a seat and does not take a chair.
- [ ] Every player gets a stable cartoon face generated from their identity. The same person shows the same face on every device. There is no photo upload.
- [ ] As a guest: set a name (up to 24 characters; it saves on its own; a generated guest name stays blank until you type something), **Create account** (email and password on this same person), or **Sign in** to an existing account.
- [ ] Creating an account keeps this person (name, seat, hosted tables). Signing in to another account moves the guest’s name and hosted tables over, then drops the throwaway guest.
- [ ] Signed in: change password, sign out (you become a new guest), and see **Mission history** of completed attempts (win or fail, date). Guests do not get history.
- [ ] Theme, SFX volume, and animation prefs in the sheet are stubs (“Coming later”). Mute at the table is real (see Sound).

## Lobby

- [ ] You always sit at the **bottom**. Others sit clockwise: 3 players left and right; 4 with one across; 5 around the well (west, northwest, northeast, east).
- [ ] Empty chairs stay visible until someone sits.
- [ ] Each chair shows that player’s face and name. Your chair has an editable name field; changing it updates every seat.
- [ ] Tap **Sit ready**. Others see a ready mark. Only the host can **Play**, and only when every chair is filled and ready.
- [ ] Tap the lobby code to copy a **full invite URL**.
- [ ] Host-only setup lives behind a **Settings** button in the well (opens a drawer from the bottom). Guests can open it to read the current choices, not change them:
  - **Seats** 3–5 (default 4). Changing this keeps the same lobby code and does not reload the table. You cannot drop a chair someone is sitting in; kick them first.
  - **Difficulty** 1–16 (default 4).
  - **Captain**: random, or a specific chair (a selector, not a row of buttons). That chair is dealt submarine 4. Captain is still “who holds submarine 4.”
  - **Distress** off (default) or on. Off skips the distress step after the draft.
- [ ] Completed tricks are always on: tap a won-trick count to see every trick that player won. There is no lobby toggle.
- [ ] Dummy teammates still play after Start if they are seated. The host can tap an empty chair and choose **Bot**.
- [ ] Host can tap a seated guest or bot (not themselves, not after Start) and choose **Kick**, then confirm. A kicked guest cannot rejoin for a short wait; each later kick of the same person doubles the wait (about 10s, then 20s, …). They see that they must wait. A bot leaves the chair at once.

## Table layout (lobby and play)

- [ ] The table stays on the phone screen (no page scroll off the well). Safe areas keep taps above the home indicator. **Play** sits at the bottom of the screen (not under the browser chrome) and stays disabled while chairs are empty.
- [ ] At ~360×640 with five players in the lobby, chairs stay around the well; the Settings button stays in the center; Play stays on the bottom edge; east/west seats do not cover the well.
- [ ] On a wider frame in the lobby, opponents sit around the well. You stay at the bottom.
- [ ] During play, every player’s head sits in one row at the top of the board, for 3, 4, or 5 players. The player who leads the trick is on the far left; the rest follow in play order to their right. Your cards stay at the bottom.
- [ ] Long names ellipsize instead of overflowing.

## Presence

- [ ] A dropped connection (tab close, network) keeps the seat. That avatar greys out with a **•••** “Reconnecting” mark. Coming back in the same browser restores the seat.
- [ ] Leaving with **Crew** (home) shows a red leaving overlay, then the chair clears after about two seconds so someone else can sit.
- [ ] Ordinary disconnects do not clear the seat the way a voluntary leave does.

## Dummy teammates

- [ ] After Start, bots take a legal task or card on their turn, with a short human-like pause (about half a second to a few seconds) between plays.
- [ ] Bots do **not** use sonar and do **not** skip or activate distress, so those choices still appear for the human.
- [ ] Bot delays survive a reconnect; they do not dump every bot card at once.

## Deal and captain

- [ ] Start deals a real mission. You see your cards; opponents show a **count**, never their faces.
- [ ] The holder of **submarine 4** is captain (crown on that seat). A designated captain in the lobby is that seat receiving submarine 4.
- [ ] With 3 players, one leftover card sits face-down in the well and is never played.
- [ ] If a submarine task’s printed deal is impossible (for example one seat holds every submarine), the playing cards are dealt again. The tasks stay.

## Task draft

- [ ] Face-up tasks sit in the center. On your draft turn you tap a task to take it, or **Pass**.
- [ ] After you take an “I will win X tricks” card, you name that number. Open cards show it to the crew; hidden cards keep it until the result.
- [ ] Tasks at seats (yours and others) are illustrated cards. Tap one to open a larger Task overlay; Escape or Close dismisses it.
- [ ] Completed tasks read as done; failed tasks as failed. Takeable tasks in the center are marked so they look takeable.

## Distress

- [ ] After the draft (if distress is on), an overlay offers **Skip** or pass a color card **left / right**. Skip is as obvious as activate.
- [ ] Pass left / pass right match the seats you see (clockwise around the table).
- [ ] You pick a **color** card (not a submarine), then **Pass**. Illegal cards explain why (for example, cannot pass a submarine).
- [ ] If distress is off in the lobby, play starts without this step.

## Hand and playing a card

- [ ] Your hand is a flat overlapping row. A tap hits the **visible** face, not a neighbor hiding under it. Dragging across the row peeks and selects.
- [ ] Cards are grouped **by number, then by color** (pink, yellow, green, blue, then submarine), so like numbers sit together.
- [ ] On your turn, tap a legal card: it lifts. Tap it again, or tap **Play**, to play it. A legal play lands in the well with a short place sound.
- [ ] Illegal cards stay in the row, muted. Selecting one shows why (for example “Must follow suit”). Tapping an illegal card nudges it and ticks; it does not play.
- [ ] You must follow the led color when you can. A submarine beats every color; the highest submarine wins if more than one is played.
- [ ] Reduced motion: land, win pulse, sonar pulse, and nudge animations do not run.

## Tricks

- [ ] Each seat shows whose turn it is, a sonar dot before the name, a won-trick count after the name, and that player’s tasks under the name. Seats without a task stay as short as the name row — no empty task hole.
- [ ] Newly played cards land in a single centered row, left to right in the order they were played, so every face stays visible. The led card is marked.
- [ ] When the last card of a trick is down, the cards **stay in the well about two seconds**, the winner pulses, and a **progress bar** counts down to the next trick.
- [ ] During that countdown: **Keep trick visible** pauses the bar and leaves the cards. The button becomes **Start next trick**, which clears the well immediately.
- [ ] If you do nothing, the well clears on its own when the bar finishes.
- [ ] Retry / a new attempt does not leave a leftover hold or progress bar on screen.
- [ ] Won-trick counts always show as a number after the name. Tap the number to review every trick that player won.

## Sonar

- [ ] A small circle before each name is green and pulsing while that player still has sonar, red and still once it has been used. Tap your own green circle to open sonar: pick a color card from your hand, then **Highest / Only / Lowest**. Illegal combinations cannot be confirmed (no submarine; it must really be your highest, only, or lowest of that color).
- [ ] You may set sonar **during a trick**. The crew does not see it until the trick ends. You can change or cancel the queued choice until then.
- [ ] Once revealed, the communicated card stays on that seat (card + highest/only/lowest) until the trick that contains that card ends, then it clears.
- [ ] Tap the sonar dot or a communicated card to read the reminder (highest / only / lowest). Escape or Close dismisses it.
- [ ] Sonar is once per player per mission.

## Sound

- [ ] Table chrome has **Sound / Muted**. Mute persists across reload. Default is sound on.
- [ ] Playing a card, an illegal tap, a trick win, and mission won/failed each have a short cue. There is no background music under play.

## Result

- [ ] Won or Failed is obvious. A short **mission review** says why: every task completed, or a task became impossible, or the crew ran out of cards.
- [ ] Failed tasks name the owner. A count shows how many tasks were completed, and leftover unfinished work is mentioned when the mission ended early.
- [ ] A scrollable **match history** lists every trick: who won it and which cards were played. This appears after both wins and failures.
- [ ] Only the **host** sees **Retry**. Retry deals the **same mission again** (new cards), same seats. Guests do not get Retry.

## Catalog

- [ ] **Browse assets** → Mission tasks and Playing cards.
- [ ] Mission tasks: the official **96** task cards, grouped by type, with a readable sentence, id, difficulty for 3/4/5 players, and a captain-may-select mark.
- [ ] Playing cards: all 40 faces by suit (including submarine 4 as Captain) plus table states (legal, selected, muted, back, …).
- [ ] Old `/missions` and `/playing-cards` links still land on the catalogs.

## Hidden information (must stay true)

- [ ] You never see another player’s hand, only how many cards they hold.
- [ ] You see the current trick, assigned tasks, sonar dots, communicated cards, captain, and won-trick counts.
- [ ] Completed-trick **contents** are hidden until you tap a pile, or the mission is over (result history).
- [ ] “Why this card is illegal” is only on your client.

---

## How to keep this file honest

When you ship or change something a player can see or do, add or edit a line here in the same voice (result, not implementation). Do not list open wishes here; those stay in issues.
