import type { CardId, Fact, IllegalReason, SeatId } from "@crew/protocol";
import { remainingTricks } from "./deal.ts";
import { nextSeat, parseCard } from "./deck.ts";
import { emit } from "./emit.ts";
import { clearSonarIfPlayed } from "./sonar.ts";
import type { EngineState } from "./state.ts";
import { contextAfterTrick, evaluateOpenTasks } from "./tasks/evaluate.ts";
import { isLegalPlay, removeCard, trickWinner } from "./trick.ts";

export function startPlay(state: EngineState, facts: Fact[]): void {
	state.phase = "play";
	state.trickId = 1;
	state.currentSeat = state.captainSeat;
	state.ledSuit = null;
	state.currentTrick = [];
	if (state.captainSeat !== null) {
		emit(state, facts, { type: "turn.started", seatId: state.captainSeat, trickId: 1 });
	}
}

export function playCard(
	state: EngineState,
	seat: SeatId,
	cardId: CardId,
	facts: Fact[],
): IllegalReason | null {
	if (state.phase !== "play" && state.phase !== "trick") {
		return "wrongPhase";
	}
	if (state.currentSeat !== seat) {
		return "notYourTurn";
	}
	const hand = state.hands[seat];
	if (hand === undefined || !hand.includes(cardId)) {
		return "cardNotInHand";
	}
	const ledSuit = state.phase === "play" ? null : state.ledSuit;
	if (!isLegalPlay(hand, cardId, ledSuit)) {
		return "mustFollowSuit";
	}

	removeCard(hand, cardId);

	if (state.phase === "play") {
		state.phase = "trick";
		state.ledSuit = parseCard(cardId).suit;
		state.currentTrick = [];
	}

	state.currentTrick.push({ seatId: seat, cardId });
	emit(state, facts, {
		type: "card.played",
		seatId: seat,
		cardId,
		trickOrder: state.currentTrick.length,
	});

	if (state.currentTrick.length < state.playerCount) {
		state.currentSeat = nextSeat(seat, state.playerCount);
		emit(state, facts, {
			type: "turn.started",
			seatId: state.currentSeat,
			trickId: state.trickId,
			ledSuit: state.ledSuit ?? undefined,
		});
		return null;
	}

	return resolveTrick(state, facts);
}

function resolveTrick(state: EngineState, facts: Fact[]): IllegalReason | null {
	const ledSuit = state.ledSuit;
	if (ledSuit === null) {
		return "wrongPhase";
	}
	const trick = [...state.currentTrick];
	const winner = trickWinner(trick, ledSuit);

	for (let seat = 0; seat < state.playerCount; seat += 1) {
		const streak = state.consecutiveWins[seat];
		if (streak === undefined) {
			continue;
		}
		state.consecutiveWins[seat] = seat === winner ? streak + 1 : 0;
	}
	state.tricksWon[winner]?.push(state.trickId);
	state.captured[winner]?.push(...trick.map((play) => play.cardId));
	state.lastTrick = {
		trickId: state.trickId,
		winnerSeat: winner,
		ledSuit,
		cards: trick,
	};
	state.completedTricks[winner]?.push(state.lastTrick);
	emit(state, facts, {
		type: "trick.resolved",
		trickId: state.trickId,
		winnerSeat: winner,
		cardIds: trick.map((play) => play.cardId),
		ledSuit,
	});
	for (const play of trick) {
		clearSonarIfPlayed(state, play.seatId, play.cardId, facts);
	}

	const ctx = contextAfterTrick(state, trick, winner, ledSuit);
	const { failed, events } = evaluateOpenTasks(state, ctx);
	for (const event of events) {
		const task = event.instance;
		if (event.eval.verdict === "completed") {
			task.status = "completed";
			task.progress = event.eval.progress;
			if (task.ownerSeat !== null) {
				emit(state, facts, {
					type: "task.completed",
					taskInstanceId: task.instanceId,
					seatId: task.ownerSeat,
				});
			}
		} else if (event.eval.verdict === "failed") {
			task.status = "failed";
			emit(state, facts, {
				type: "task.failed",
				taskInstanceId: task.instanceId,
				reason: "impossible",
			});
		} else if (event.eval.progress > task.progress) {
			task.progress = event.eval.progress;
			emit(state, facts, {
				type: "task.progressed",
				taskInstanceId: task.instanceId,
				progress: task.progress,
			});
		}
	}

	if (failed !== null) {
		endMission(state, facts, "failed", "taskImpossible");
		return null;
	}

	const open = state.tasks.filter((task) => task.status === "open");
	if (open.length === 0) {
		endMission(state, facts, "won", null);
		return null;
	}

	state.currentTrick = [];
	state.ledSuit = null;

	if (remainingTricks(state.hands) === 0) {
		endMission(state, facts, "failed", "cardsExhausted");
		return null;
	}

	state.phase = "play";
	state.trickId += 1;
	state.currentSeat = winner;
	emit(state, facts, { type: "turn.started", seatId: winner, trickId: state.trickId });
	return null;
}

function endMission(
	state: EngineState,
	facts: Fact[],
	result: "won" | "failed",
	reason: string | null,
): void {
	state.phase = "result";
	state.result = result;
	state.failReason = reason;
	state.currentSeat = null;
	const missionId = state.mission?.id ?? "";
	if (result === "won") {
		emit(state, facts, { type: "mission.won", missionId });
		return;
	}
	emit(state, facts, { type: "mission.failed", missionId, reason: reason ?? "failed" });
}
