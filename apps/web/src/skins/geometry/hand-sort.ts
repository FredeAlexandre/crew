import type { CardId } from "@crew/protocol";
import type { HandCard } from "@crew/view-model/fixtures";

const SUIT_ORDER = ["pink", "yellow", "green", "blue", "submarine"] as const;

function cardParts(cardId: CardId): { suit: string; value: number } {
	const divider = cardId.lastIndexOf("-");
	return { suit: cardId.slice(0, divider), value: Number(cardId.slice(divider + 1)) };
}

/** Sort by suit first, then by rank within each suit. */
export function sortHand(cards: readonly HandCard[]): HandCard[] {
	return [...cards].sort((left, right) => {
		const a = cardParts(left.cardId);
		const b = cardParts(right.cardId);
		const suitOrder =
			SUIT_ORDER.indexOf(a.suit as (typeof SUIT_ORDER)[number]) -
			SUIT_ORDER.indexOf(b.suit as (typeof SUIT_ORDER)[number]);
		if (suitOrder !== 0) {
			return suitOrder;
		}
		return a.value - b.value;
	});
}
