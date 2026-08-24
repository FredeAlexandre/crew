import type { CardId } from "@crew/protocol";
import type { HandCard } from "@crew/view-model/fixtures";

const SUIT_ORDER = ["pink", "yellow", "green", "blue", "submarine"] as const;

function cardParts(cardId: CardId): { suit: string; value: number } {
	const divider = cardId.lastIndexOf("-");
	return { suit: cardId.slice(0, divider), value: Number(cardId.slice(divider + 1)) };
}

/** Sort by rank first, then by the table's stable suit order. */
export function sortHand(cards: readonly HandCard[]): HandCard[] {
	return [...cards].sort((left, right) => {
		const a = cardParts(left.cardId);
		const b = cardParts(right.cardId);
		if (a.value !== b.value) {
			return a.value - b.value;
		}
		return (
			SUIT_ORDER.indexOf(a.suit as (typeof SUIT_ORDER)[number]) -
			SUIT_ORDER.indexOf(b.suit as (typeof SUIT_ORDER)[number])
		);
	});
}
