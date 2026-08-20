/**
 * 3 — play a trick (follow suit)
 *
 *   nub ./3-play-trick/index.ts
 *   nub ./3-play-trick/index.ts 11
 *
 * After the lead, anyone with the led suit must play it. apply says mustFollowSuit otherwise.
 */
import { apply, legalIntents } from "../../src/index.ts";
import { heading, note, showFacts, showIntents, showTable } from "../show.ts";
import { applyOk, seedFromArgv, startAttempt, toPlay } from "../steps.ts";

const seed = seedFromArgv(11);
let state = toPlay(startAttempt(seed).state);

heading(`first lead  seed=${seed}`);
showTable(state);

const leader = state.currentSeat;
if (leader === null) {
	throw new Error("expected a leader");
}

const lead =
	legalIntents(state, leader).find(
		(intent) => intent.type === "card.play" && !intent.cardId.startsWith("submarine-"),
	) ?? legalIntents(state, leader).find((intent) => intent.type === "card.play");
if (lead === undefined || lead.type !== "card.play") {
	throw new Error("no lead");
}

heading(`seat ${leader} leads ${lead.cardId}`);
const afterLead = applyOk(state, lead);
state = afterLead.state;
showFacts(afterLead.facts);

const follower = state.currentSeat;
if (follower === null) {
	throw new Error("expected a follower");
}
const ledSuit = lead.cardId.slice(0, lead.cardId.lastIndexOf("-"));
const followerHand = state.hands[follower] ?? [];
const legalPlays = legalIntents(state, follower).filter((intent) => intent.type === "card.play");

heading(`seat ${follower} must follow ${ledSuit} if they hold it`);
showIntents(legalPlays);

const offSuit = followerHand.find((cardId) => !cardId.startsWith(`${ledSuit}-`));
if (offSuit !== undefined) {
	const rejected = apply(state, {
		type: "card.play",
		attemptId: state.attemptId,
		seatId: follower,
		cardId: offSuit,
	});
	note(
		rejected.ok
			? `played off-suit ${offSuit} (no ${ledSuit} in hand)`
			: `off-suit ${offSuit} → ${rejected.error}`,
	);
}

const follow = legalPlays[0];
if (follow === undefined) {
	throw new Error("no legal follow");
}
heading(`seat ${follower} plays`);
const afterFollow = applyOk(state, follow);
state = afterFollow.state;
showFacts(afterFollow.facts);
showTable(state);

note("keep applying card.play until currentTrick is empty again — that was a full trick.");
note("next:  nub ./4-sonar/index.ts");
