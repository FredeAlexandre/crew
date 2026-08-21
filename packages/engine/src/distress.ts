import type { CardId, DistressDirection, Fact, IllegalReason, SeatId } from "@crew/protocol";
import { nextSeat, parseCard, prevSeat, seats } from "./deck.ts";
import { emit } from "./emit.ts";
import { startPlay } from "./play.ts";
import type { EngineState } from "./state.ts";
import { removeCard } from "./trick.ts";

export function skipDistress(state: EngineState, facts: Fact[]): IllegalReason | null {
	if (state.phase !== "distressOffer") {
		return "wrongPhase";
	}
	emit(state, facts, { type: "distress.skipped" });
	startPlay(state, facts);
	return null;
}

export function activateDistress(
	state: EngineState,
	direction: DistressDirection,
	facts: Fact[],
): IllegalReason | null {
	if (state.phase !== "distressOffer") {
		return "wrongPhase";
	}
	state.distressActive = true;
	state.distressDirection = direction;
	state.distressPassed = seats(state.playerCount).map(() => null);
	state.phase = "distressPass";
	state.currentSeat = 0;
	emit(state, facts, { type: "distress.activated", direction });
	return null;
}

export function passDistressCard(
	state: EngineState,
	seat: SeatId,
	cardId: CardId,
	facts: Fact[],
): IllegalReason | null {
	if (state.phase !== "distressPass") {
		return "wrongPhase";
	}
	if (state.currentSeat !== seat) {
		return "notYourTurn";
	}
	if ((state.distressPassed[seat] ?? null) !== null) {
		return "alreadyPassedCard";
	}
	const hand = state.hands[seat];
	if (hand === undefined || !hand.includes(cardId)) {
		return "cardNotInHand";
	}
	if (parseCard(cardId).suit === "submarine") {
		return "cannotPassSubmarine";
	}
	state.distressPassed[seat] = cardId;
	if (seat < state.playerCount - 1) {
		state.currentSeat = nextSeat(seat, state.playerCount);
		return null;
	}
	resolvePasses(state, facts);
	startPlay(state, facts);
	return null;
}

function resolvePasses(state: EngineState, facts: Fact[]): void {
	const direction = state.distressDirection;
	if (direction === null) {
		return;
	}
	const moving: { from: SeatId; to: SeatId; cardId: CardId }[] = [];
	for (const from of seats(state.playerCount)) {
		const cardId = state.distressPassed[from];
		if (cardId === null || cardId === undefined) {
			continue;
		}
		const to =
			direction === "right" ? nextSeat(from, state.playerCount) : prevSeat(from, state.playerCount);
		moving.push({ from, to, cardId });
	}
	for (const move of moving) {
		const hand = state.hands[move.from];
		if (hand !== undefined) {
			removeCard(hand, move.cardId);
		}
	}
	for (const move of moving) {
		state.hands[move.to]?.push(move.cardId);
		emit(state, facts, {
			type: "card.passed",
			fromSeat: move.from,
			toSeat: move.to,
			cardId: move.cardId,
		});
	}
}

export function legalDistressPassCards(state: EngineState, seat: SeatId): CardId[] {
	if (state.phase !== "distressPass" || state.currentSeat !== seat) {
		return [];
	}
	return (state.hands[seat] ?? []).filter((id) => parseCard(id).suit !== "submarine");
}
