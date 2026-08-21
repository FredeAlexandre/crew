import { z } from "zod";
import { type ColorSuit, colorSuitSchema, type Suit } from "./ids.ts";

export const COLOR_SUITS = [
	"pink",
	"yellow",
	"green",
	"blue",
] as const satisfies readonly ColorSuit[];
export const COLOR_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
export const SUBMARINE_VALUES = [1, 2, 3, 4] as const;

export const CARD_IDS = [
	"pink-1",
	"pink-2",
	"pink-3",
	"pink-4",
	"pink-5",
	"pink-6",
	"pink-7",
	"pink-8",
	"pink-9",
	"yellow-1",
	"yellow-2",
	"yellow-3",
	"yellow-4",
	"yellow-5",
	"yellow-6",
	"yellow-7",
	"yellow-8",
	"yellow-9",
	"green-1",
	"green-2",
	"green-3",
	"green-4",
	"green-5",
	"green-6",
	"green-7",
	"green-8",
	"green-9",
	"blue-1",
	"blue-2",
	"blue-3",
	"blue-4",
	"blue-5",
	"blue-6",
	"blue-7",
	"blue-8",
	"blue-9",
	"submarine-1",
	"submarine-2",
	"submarine-3",
	"submarine-4",
] as const;

export const cardIdSchema = z.enum(CARD_IDS);
export type CardId = z.infer<typeof cardIdSchema>;

export function splitCardId(cardId: CardId): { suit: Suit; value: number } {
	const separator = cardId.lastIndexOf("-");
	return {
		suit: cardId.slice(0, separator) as Suit,
		value: Number(cardId.slice(separator + 1)),
	};
}

export function isColorSuit(suit: Suit): suit is ColorSuit {
	return colorSuitSchema.safeParse(suit).success;
}
