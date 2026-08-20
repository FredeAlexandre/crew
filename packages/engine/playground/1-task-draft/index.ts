/**
 * 1 — legalIntents + apply during task draft
 *
 *   nub ./1-task-draft/index.ts
 *   nub ./1-task-draft/index.ts 4
 *
 * Query what the current seat may do, then apply one of those intents.
 * Illegal apply returns an error and leaves the input state untouched.
 */
import { apply, createAttempt, legalIntents } from "../../src/index.ts";
import { heading, note, showFacts, showIntents, showTable } from "../show.ts";
import { seedFromArgv } from "../steps.ts";

const seed = seedFromArgv(1);

let { state } = createAttempt({
	attemptId: "a1",
	mission: { id: "m1", difficulty: 4 },
	playerCount: 4,
	seed,
});

heading(`start  seed=${seed}  difficulty 4 (several tasks in the center)`);
showTable(state);

const otherSeat = state.currentSeat === 0 ? 1 : 0;
heading(`legalIntents for seat ${otherSeat} (not their turn)`);
showIntents(legalIntents(state, otherSeat));

const beforeIllegal = state;
const illegal = apply(state, {
	type: "card.play",
	attemptId: state.attemptId,
	seatId: state.currentSeat ?? 0,
	cardId: "pink-1",
});
heading("apply a card during draft");
note(illegal.ok ? "unexpected success" : `rejected: ${illegal.error}`);
note(`same object still in phase ${beforeIllegal.phase} — apply never mutates the input`);

while (state.phase === "taskDraft") {
	const seat = state.currentSeat;
	if (seat === null) {
		throw new Error("draft with no current seat");
	}
	const intents = legalIntents(state, seat);
	heading(`seat ${seat} to act`);
	showIntents(intents);

	// Prefer taking a task. Swap to `intents.find((i) => i.type === "task.pass")` to pass instead.
	const chosen = intents.find((intent) => intent.type === "task.take") ?? intents[0];
	if (chosen === undefined) {
		throw new Error("no draft intent");
	}
	note(`applying ${chosen.type}`);
	const result = apply(state, chosen);
	if (!result.ok) {
		throw new Error(result.error);
	}
	state = result.state;
	showFacts(result.facts);
}

heading("draft over");
showTable(state);
note(`phase is ${state.phase}: crew may skip distress or pass one color card.`);
note("next:  nub ./2-distress/index.ts");
