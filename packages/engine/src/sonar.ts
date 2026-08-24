import type { CardId, Fact, IllegalReason, SeatId, SonarPosition } from "@crew/protocol";
import { cardsOfSuit, parseCard } from "./deck.ts";
import { emit } from "./emit.ts";
import type { EngineState } from "./state.ts";

export function sonarPositionFor(hand: readonly CardId[], cardId: CardId): SonarPosition | null {
	const card = parseCard(cardId);
	if (card.suit === "submarine") {
		return null;
	}
	const ofColor = cardsOfSuit(hand, card.suit).map(parseCard);
	if (ofColor.length === 0) {
		return null;
	}
	if (ofColor.length === 1) {
		return ofColor[0]?.id === cardId ? "only" : null;
	}
	const values = ofColor.map((entry) => entry.value);
	const max = Math.max(...values);
	const min = Math.min(...values);
	if (card.value === max && card.value !== min) {
		return "highest";
	}
	if (card.value === min && card.value !== max) {
		return "lowest";
	}
	return null;
}

export function sonarCandidates(
	state: EngineState,
	seat: SeatId,
): { cardId: CardId; position: SonarPosition }[] {
	if (state.phase !== "play" && state.phase !== "trick") {
		return [];
	}
	if (state.mission?.flags?.sonarDisabled === true) {
		return [];
	}
	const slot = state.sonar[seat];
	if (slot === undefined || !slot.available) {
		return [];
	}
	const hand = state.hands[seat] ?? [];
	const uses: { cardId: CardId; position: SonarPosition }[] = [];
	for (const cardId of hand) {
		const position = sonarPositionFor(hand, cardId);
		if (position !== null) {
			uses.push({ cardId, position });
		}
	}
	return uses;
}

export function legalSonarUses(
	state: EngineState,
	seat: SeatId,
): { cardId: CardId; position: SonarPosition }[] {
	if (state.phase !== "play") {
		return [];
	}
	return sonarCandidates(state, seat);
}

export function useSonar(
	state: EngineState,
	seat: SeatId,
	cardId: CardId,
	position: SonarPosition,
	facts: Fact[],
): IllegalReason | null {
	if (state.phase === "trick") {
		return "sonarDuringTrick";
	}
	if (state.phase !== "play") {
		return "wrongPhase";
	}
	if (state.mission?.flags?.sonarDisabled === true) {
		return "sonarDisabled";
	}
	const slot = state.sonar[seat];
	if (slot === undefined) {
		return "illegalSeat";
	}
	if (!slot.available) {
		return "sonarAlreadyUsed";
	}
	const hand = state.hands[seat] ?? [];
	if (!hand.includes(cardId)) {
		return "cardNotInHand";
	}
	if (parseCard(cardId).suit === "submarine") {
		return "sonarSubmarine";
	}
	const legal = sonarPositionFor(hand, cardId);
	if (legal === null || legal !== position) {
		return "sonarNotExtreme";
	}
	slot.available = false;
	slot.communication = { cardId, position };
	emit(state, facts, { type: "sonar.used", seatId: seat, cardId, position });
	return null;
}

export function clearSonarIfPlayed(
	state: EngineState,
	seat: SeatId,
	cardId: CardId,
	facts: Fact[],
): void {
	const slot = state.sonar[seat];
	if (slot?.communication?.cardId === cardId) {
		slot.communication = null;
		emit(state, facts, { type: "sonar.cleared", seatId: seat });
	}
}
