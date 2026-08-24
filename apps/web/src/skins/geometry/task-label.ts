import { type CardId, splitCardId, type TaskPublic } from "@crew/protocol";

function formatCard(cardId: CardId): string {
	const { suit, value } = splitCardId(cardId);
	if (suit === "submarine") {
		return `submarine ${value}`;
	}
	return `${suit} ${value}`;
}

function formatCards(cards: readonly CardId[]): string {
	if (cards.length === 0) {
		return "";
	}
	const [first, second, ...rest] = cards;
	if (rest.length === 0 && second === undefined) {
		return formatCard(first);
	}
	if (rest.length === 0 && second !== undefined) {
		return `${formatCard(first)} and ${formatCard(second)}`;
	}
	const last = cards.at(-1);
	if (last === undefined) {
		return cards.map(formatCard).join(", ");
	}
	return `${cards.slice(0, -1).map(formatCard).join(", ")}, and ${formatCard(last)}`;
}

export function taskCatalogLabel(spec: TaskPublic): string {
	switch (spec.kind) {
		case "winCards":
			return `Win ${formatCards(spec.cards)}`;
		case "winColor":
			return `Win ${spec.count} ${spec.suit} trick${spec.count === 1 ? "" : "s"}`;
		case "winValue":
			return `Win ${spec.count} trick${spec.count === 1 ? "" : "s"} with a ${spec.value}`;
		case "winSubmarines":
			return `Win ${spec.count} submarine trick${spec.count === 1 ? "" : "s"}`;
		case "winWith": {
			if (spec.card) {
				return `Win a trick with ${formatCard(spec.card)}`;
			}
			if (spec.suit && spec.value !== undefined) {
				return `Win a trick with ${spec.suit} ${spec.value}`;
			}
			if (spec.suit) {
				return `Win a trick with ${spec.suit}`;
			}
			if (spec.value !== undefined) {
				return `Win a trick with a ${spec.value}`;
			}
			return "Win with a card";
		}
		case "avoid": {
			if (spec.submarines) {
				return "Win no submarine tricks";
			}
			if (spec.suit) {
				return `Win no ${spec.suit} tricks`;
			}
			if (spec.value !== undefined) {
				return `Win no tricks with a ${spec.value}`;
			}
			if (spec.cards) {
				return `Win none of ${formatCards(spec.cards)}`;
			}
			return "Avoid winning";
		}
		case "trickCount":
			if (spec.op === "exact") {
				return `Win exactly ${spec.count} trick${spec.count === 1 ? "" : "s"}`;
			}
			if (spec.op === "atLeast") {
				return `Win at least ${spec.count} trick${spec.count === 1 ? "" : "s"}`;
			}
			return `Win at most ${spec.count} trick${spec.count === 1 ? "" : "s"}`;
		case "consecutiveTricks":
			return `Win ${spec.count} tricks in a row`;
		case "nthTrick":
			return spec.n === 0 ? "Win the last trick" : `Win trick ${spec.n}`;
		case "compareTricks": {
			const target = spec.vs === "captain" ? "the captain" : "each other player";
			if (spec.op === "moreThan") {
				return `Win more tricks than ${target}`;
			}
			if (spec.op === "fewerThan") {
				return `Win fewer tricks than ${target}`;
			}
			return `Win the same number of tricks as ${target}`;
		}
		case "trickSum": {
			const relation = spec.op === "gt" ? "over" : spec.op === "lt" ? "under" : "exactly";
			const subNote = spec.noSubmarines ? ", no submarines" : "";
			return `Win a trick summing ${relation} ${spec.target}${subNote}`;
		}
		case "trickFilter": {
			const subNote = spec.noSubmarines ? ", no submarines" : "";
			if (spec.filter === "allGt" && spec.bound !== undefined) {
				return `Win a trick where every card is above ${spec.bound}${subNote}`;
			}
			if (spec.filter === "allLt" && spec.bound !== undefined) {
				return `Win a trick where every card is below ${spec.bound}${subNote}`;
			}
			if (spec.filter === "allOdd") {
				return `Win a trick where every card is odd${subNote}`;
			}
			return `Win a trick where every card is even${subNote}`;
		}
		case "collectAllColors":
			return "Win at least one card of every color";
		case "collectAllOfOneColor":
			return "Win every card of one color";
		case "collectMoreColor":
			return `Win more ${spec.more} than ${spec.less}`;
	}
}
