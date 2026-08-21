/**
 * 4 — sonar (between tricks only)
 *
 *   nub ./4-sonar/index.ts
 *
 * Anyone may communicate once, only in phase "play", and only the highest / lowest / only
 * card of a color in their hand. Submarines cannot be announced.
 */
import { type Intent, legalIntents } from "../../src/index.ts";
import { heading, note, showFacts, showIntents, showSonar, showTable } from "../show.ts";
import { applyOk, seedFromArgv, startAttempt, toPlay } from "../steps.ts";

const seed = seedFromArgv(1);
const state = toPlay(startAttempt(seed).state);

heading(`phase ${state.phase}  seed=${seed}`);
note("sonar is legal for every seat right now, not only the leader");

let sonar: Intent | null = null;
for (let seat = 0; seat < state.playerCount; seat += 1) {
	const uses = legalIntents(state, seat).filter((intent) => intent.type === "sonar.use");
	heading(`seat ${seat} sonar options`);
	showIntents(uses);
	if (sonar === null && uses[0] !== undefined) {
		sonar = uses[0];
	}
}

if (sonar === null || sonar.type !== "sonar.use") {
	throw new Error("no sonar option — try another seed");
}

heading(`seat ${sonar.seatId} announces ${sonar.cardId} as ${sonar.position}`);
const used = applyOk(state, sonar);
showFacts(used.facts);

heading("sonar tokens");
showSonar(used.state);

heading("table (turn unchanged — sonar is not a play)");
showTable(used.state);
note("playing the announced card later emits sonar.cleared. next:  nub ./5-full-mission/index.ts");
