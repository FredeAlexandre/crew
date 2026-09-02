import { COLOR_SUITS, splitCardId } from "@crew/protocol";
import type { HandCard } from "@crew/view-model/fixtures";

const SUIT_ORDER = [...COLOR_SUITS, "submarine"] as const;

/** Sort by suit color first, then by rank within each color. Submarines sit last. */
export function sortHand(cards: readonly HandCard[]): HandCard[] {
	return [...cards].sort((left, right) => {
		const a = splitCardId(left.cardId);
		const b = splitCardId(right.cardId);
		const suitDiff = SUIT_ORDER.indexOf(a.suit) - SUIT_ORDER.indexOf(b.suit);
		if (suitDiff !== 0) {
			return suitDiff;
		}
		return a.value - b.value;
	});
}
