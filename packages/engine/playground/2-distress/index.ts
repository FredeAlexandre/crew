/**
 * 2 — distress: skip, or pass a card left/right
 *
 *   nub ./2-distress/index.ts
 *
 * apply clones state, so both branches start from the same post-draft snapshot.
 */
import { legalIntents } from "../../src/index.ts";
import { heading, note, showFacts, showIntents, showTable } from "../show.ts";
import { applyOk, completeDraft, seedFromArgv, startAttempt } from "../steps.ts";

const seed = seedFromArgv(1);
const afterDraft = completeDraft(startAttempt(seed).state);

heading(`after draft  seed=${seed}`);
note(`phase ${afterDraft.phase} — any seat may skip or activate`);
showIntents(legalIntents(afterDraft, 0));

heading("branch A — skip, go straight to the first lead");
const skipped = applyOk(afterDraft, {
	type: "distress.skip",
	attemptId: afterDraft.attemptId,
	seatId: 0,
});
showFacts(skipped.facts);
showTable(skipped.state);

heading("branch B — activate left (afterDraft is still distressOffer)");
note(`afterDraft.phase is still ${afterDraft.phase}`);
note("passes are silent until the last seat; then every card.passed fires at once");
let passing = applyOk(afterDraft, {
	type: "distress.activate",
	attemptId: afterDraft.attemptId,
	seatId: 0,
	direction: "left",
}).state;

let listedOptions = false;
while (passing.phase === "distressPass") {
	const seat = passing.currentSeat;
	if (seat === null) {
		throw new Error("pass with no current seat");
	}
	const intents = legalIntents(passing, seat);
	const pass = intents[0];
	if (pass === undefined || pass.type !== "distress.passCard") {
		throw new Error("no pass intent");
	}
	if (!listedOptions) {
		heading(`seat ${seat} — ${intents.length} color cards, no submarines`);
		showIntents(intents);
		listedOptions = true;
	}
	note(`seat ${seat} passes ${pass.cardId}`);
	const result = applyOk(passing, pass);
	passing = result.state;
	if (result.facts.length > 0) {
		showFacts(result.facts);
	}
}

heading("after every seat passed");
showTable(passing);
note("submarines never move. next:  nub ./3-play-trick/index.ts");
