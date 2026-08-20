import type { CardId, SeatId, Suit } from "@crew/protocol";
import { parseCard } from "./deck.ts";
import type { TrickPlay } from "./state.ts";

export function legalCards(hand: readonly CardId[], ledSuit: Suit | null): CardId[] {
	if (ledSuit === null) {
		return [...hand];
	}
	const matching = hand.filter((id) => parseCard(id).suit === ledSuit);
	return matching.length > 0 ? matching : [...hand];
}

export function isLegalPlay(
	hand: readonly CardId[],
	cardId: CardId,
	ledSuit: Suit | null,
): boolean {
	return legalCards(hand, ledSuit).includes(cardId);
}

export function trickWinner(plays: readonly TrickPlay[], ledSuit: Suit): SeatId {
	const parsed = plays.map((play) => ({ ...play, ...parseCard(play.cardId) }));
	const submarines = parsed.filter((play) => play.suit === "submarine");
	const contenders =
		submarines.length > 0 ? submarines : parsed.filter((play) => play.suit === ledSuit);
	const winner = contenders.reduce((best, play) => (play.value > best.value ? play : best));
	return winner.seatId;
}

export function removeCard(hand: CardId[], cardId: CardId): boolean {
	const index = hand.indexOf(cardId);
	if (index < 0) {
		return false;
	}
	hand.splice(index, 1);
	return true;
}
