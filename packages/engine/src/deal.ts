import type { CardId, RedealIf, SeatId } from "@crew/protocol";
import { parseCard } from "./deck.ts";

export function dealHands(deck: readonly CardId[], playerCount: number): CardId[][] {
	const hands: CardId[][] = Array.from({ length: playerCount }, () => []);
	for (let i = 0; i < deck.length; i += 1) {
		const card = deck[i];
		const hand = hands[i % playerCount];
		if (card === undefined || hand === undefined) {
			continue;
		}
		hand.push(card);
	}
	return hands;
}

export function seatWithCard(hands: readonly CardId[][], cardId: CardId): SeatId | null {
	for (let seat = 0; seat < hands.length; seat += 1) {
		if (hands[seat]?.includes(cardId) === true) {
			return seat as SeatId;
		}
	}
	return null;
}

export function giveCardToSeat(hands: CardId[][], cardId: CardId, seat: SeatId): void {
	const current = seatWithCard(hands, cardId);
	if (current === null || current === seat) {
		return;
	}
	const fromHand = hands[current];
	const toHand = hands[seat];
	if (fromHand === undefined || toHand === undefined || toHand.length === 0) {
		return;
	}
	const fromIndex = fromHand.indexOf(cardId);
	const swapped = toHand[0];
	if (fromIndex === -1 || swapped === undefined) {
		return;
	}
	toHand[0] = cardId;
	fromHand[fromIndex] = swapped;
}

export function remainingTricks(hands: readonly CardId[][]): number {
	if (hands.length === 0) {
		return 0;
	}
	return Math.min(...hands.map((hand) => hand.length));
}

export function colorValueSum(cardIds: readonly CardId[]): number {
	let sum = 0;
	for (const id of cardIds) {
		const card = parseCard(id);
		if (card.suit !== "submarine") {
			sum += card.value;
		}
	}
	return sum;
}

function submarineValues(hand: readonly CardId[]): Set<number> {
	const values = new Set<number>();
	for (const id of hand) {
		const card = parseCard(id);
		if (card.suit === "submarine") {
			values.add(card.value);
		}
	}
	return values;
}

export function handForcesRedeal(hands: readonly CardId[][], condition: RedealIf): boolean {
	for (const hand of hands) {
		const subs = submarineValues(hand);
		if (condition === "allSubmarines" && subs.size === 4) {
			return true;
		}
		if (condition === "sub1and4or123") {
			if (subs.has(1) && subs.has(4)) {
				return true;
			}
			if (subs.has(1) && subs.has(2) && subs.has(3)) {
				return true;
			}
		}
		if (condition === "sub2and4or123") {
			if (subs.has(2) && subs.has(4)) {
				return true;
			}
			if (subs.has(1) && subs.has(2) && subs.has(3)) {
				return true;
			}
		}
		if (condition === "sub234" && subs.has(2) && subs.has(3) && subs.has(4)) {
			return true;
		}
	}
	return false;
}
