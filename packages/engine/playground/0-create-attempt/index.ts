/**
 * 0 — createAttempt
 *
 * From packages/engine/playground:
 *   nub ./0-create-attempt/index.ts
 *   nub ./0-create-attempt/index.ts 11
 *
 * Same seed ⇒ same deal. The number is the only thing you need to change to reshuffle.
 */
import { createAttempt } from "../../src/index.ts";
import { heading, note, showFacts, showTable } from "../show.ts";
import { seedFromArgv } from "../steps.ts";

const seed = seedFromArgv(1);

const { state, facts } = createAttempt({
	attemptId: "a1",
	mission: { id: "m1", difficulty: 1 },
	playerCount: 4,
	seed,
});

heading(`createAttempt  seed=${seed}`);
showFacts(facts);

heading("table");
showTable(state);

heading("what just happened");
note(`phase is ${state.phase}: captain (seat ${state.captainSeat}) drafts first.`);
note("next:  nub ./1-task-draft/index.ts");
