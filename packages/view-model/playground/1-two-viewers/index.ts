/**
 * 1 — two viewers of the same table
 *
 *   nub ./1-two-viewers/index.ts
 *
 * Same EngineState, two projections. Cheating is a view-model bug: opponent
 * card ids must not appear in the other client's JSON.
 */
import { project } from "../../src/project.ts";
import { heading, note, showView } from "../show.ts";
import { seedFromArgv, startAttempt } from "../steps.ts";

const seed = seedFromArgv(1);
const { state } = startAttempt(seed);
const a = state.captainSeat ?? 0;
const b = ((a + 1) % state.playerCount) as 0 | 1 | 2 | 3 | 4;
const viewA = project(state, a);
const viewB = project(state, b);

heading(`viewer A  engine-seat ${a}  seed=${seed}`);
showView(viewA);

heading(`viewer B  engine-seat ${b}`);
showView(viewB);

heading("rotation");
note(`A: ${viewA.seats.map((seat) => `${seat.region}=${seat.seatId}`).join("  ")}`);
note(`B: ${viewB.seats.map((seat) => `${seat.region}=${seat.seatId}`).join("  ")}`);

heading("visibility");
const dumped = JSON.stringify(viewB);
const aHand = state.hands[a] ?? [];
const leaked = aHand.filter((cardId) => dumped.includes(cardId));
const hidden = aHand.filter((cardId) => !dumped.includes(cardId));
note(`A holds ${aHand.length} cards. B's JSON mentions ${leaked.length} of them.`);
if (leaked.length > 0) {
	note(`mentioned (ok if they are on public tasks): ${leaked.join("  ")}`);
}
note(`private to A: ${hidden.join("  ") || "(none)"}`);
note("next:  nub ./2-facts/index.ts");
