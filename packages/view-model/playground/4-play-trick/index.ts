/**
 * 4 — play a trick (legal cards on the viewer's hand)
 *
 *   nub ./4-play-trick/index.ts
 *   nub ./4-play-trick/index.ts 11
 *
 * After the lead, illegal cards stay visible and carry why (mustFollowSuit / notYourTurn).
 */
import { legalIntents } from "@crew/engine";
import { project } from "../../src/project.ts";
import { heading, note, showView } from "../show.ts";
import { applyOk, playCards, seedFromArgv, startAttempt, toPlay } from "../steps.ts";

const seed = seedFromArgv(11);
let state = toPlay(startAttempt(seed).state);

heading(`first lead  seed=${seed}`);
const leader = state.currentSeat;
if (leader === null) {
	throw new Error("expected a leader");
}

heading(`leader's screen before the lead  engine-seat ${leader}`);
const before = project(state, leader);
note(`canPlay ${before.affordances.canPlay}  canSonar ${before.affordances.canSonar}`);
note(
	`sonar candidates: ${
		before.sonarCandidates
			.map((candidate) => `${candidate.cardId}/${candidate.position}`)
			.join("  ") || "(none)"
	}`,
);

const lead =
	legalIntents(state, leader).find(
		(intent) => intent.type === "card.play" && !intent.cardId.startsWith("submarine-"),
	) ?? legalIntents(state, leader).find((intent) => intent.type === "card.play");
if (lead === undefined || lead.type !== "card.play") {
	throw new Error("no lead");
}

heading(`engine-seat ${leader} leads ${lead.cardId}`);
state = applyOk(state, lead).state;

const follower = state.currentSeat;
if (follower === null) {
	throw new Error("expected a follower");
}

heading(`follower's screen  engine-seat ${follower}`);
showView(project(state, follower));

heading(`leader's screen  engine-seat ${leader} (not their turn)`);
const leaderView = project(state, leader);
note(
	`hand illegalReason: ${[...new Set(leaderView.hand.map((card) => card.illegalReason))].join("  ")}`,
);
note(`trick still public: ${leaderView.trick.cards.map((card) => card.cardId).join("  ")}`);

heading("finish the trick — lastTrick appears for every viewer");
state = playCards(state, state.playerCount - 1);
const after = project(state, 0);
showView(after);
note(
	"canPeekLastTrick is true for everyone; the winner's pile is the tap target (isLastTrickWinner).",
);
note("next:  nub ./5-fixtures/index.ts");
