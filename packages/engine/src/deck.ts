import { CARD_IDS, type CardId, COLOR_SUITS, type SeatId, type Suit } from "@crew/protocol";

type ParsedCard = {
	id: CardId;
	suit: Suit;
	value: number;
};

export const DECK: readonly CardId[] = CARD_IDS;

export function parseCard(id: CardId): ParsedCard {
	const dash = id.lastIndexOf("-");
	const suit = id.slice(0, dash) as Suit;
	const value = Number(id.slice(dash + 1));
	return { id, suit, value };
}

export function cardsOfSuit(ids: readonly CardId[], suit: Suit): CardId[] {
	return ids.filter((id) => parseCard(id).suit === suit);
}

export function nextSeat(seat: SeatId, playerCount: number): SeatId {
	return ((seat + 1) % playerCount) as SeatId;
}

export function prevSeat(seat: SeatId, playerCount: number): SeatId {
	return ((seat - 1 + playerCount) % playerCount) as SeatId;
}

export function seats(playerCount: number): SeatId[] {
	return Array.from({ length: playerCount }, (_, i) => i as SeatId);
}

export { COLOR_SUITS };
