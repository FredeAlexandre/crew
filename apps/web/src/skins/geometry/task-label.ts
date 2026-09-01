import { type CardId, type Suit, splitCardId, type TaskPublic } from "@crew/protocol";
import type { Translate } from "../../lib/i18n.tsx";

function suitName(suit: Suit, t: Translate): string {
	if (suit === "pink") {
		return t("suitPink");
	}
	if (suit === "yellow") {
		return t("suitYellow");
	}
	if (suit === "green") {
		return t("suitGreen");
	}
	if (suit === "blue") {
		return t("suitBlue");
	}
	return t("suitSubmarine");
}

function formatCard(cardId: CardId, t: Translate): string {
	const { suit, value } = splitCardId(cardId);
	return t("cardName", { suit: suitName(suit, t), value });
}

function formatCards(cards: readonly CardId[], t: Translate): string {
	if (cards.length === 0) {
		return "";
	}
	const [first, second, ...rest] = cards;
	if (rest.length === 0 && second === undefined) {
		return formatCard(first, t);
	}
	if (rest.length === 0 && second !== undefined) {
		return t("cardsAnd", { a: formatCard(first, t), b: formatCard(second, t) });
	}
	const last = cards.at(-1);
	if (last === undefined) {
		return cards.map((card) => formatCard(card, t)).join(", ");
	}
	return t("cardsListEnd", {
		list: cards
			.slice(0, -1)
			.map((card) => formatCard(card, t))
			.join(", "),
		last: formatCard(last, t),
	});
}

function countKey(count: number, one: string, many: string): string {
	return count === 1 ? one : many;
}

export function taskCatalogLabel(spec: TaskPublic, t: Translate): string {
	switch (spec.kind) {
		case "winCards":
			return t("taskWinCards", { cards: formatCards(spec.cards, t) });
		case "winColor":
			return t(countKey(spec.count, "taskWinColorOne", "taskWinColorMany"), {
				count: spec.count,
				suit: suitName(spec.suit, t),
			});
		case "winValue":
			return t(countKey(spec.count, "taskWinValueOne", "taskWinValueMany"), {
				count: spec.count,
				value: spec.value,
			});
		case "winSubmarines":
			return t(countKey(spec.count, "taskWinSubOne", "taskWinSubMany"), { count: spec.count });
		case "winWith": {
			if (spec.card) {
				return t("taskWinWithCard", { card: formatCard(spec.card, t) });
			}
			if (spec.suit && spec.value !== undefined) {
				return t("taskWinWithSuitValue", { suit: suitName(spec.suit, t), value: spec.value });
			}
			if (spec.suit) {
				return t("taskWinWithSuit", { suit: suitName(spec.suit, t) });
			}
			if (spec.value !== undefined) {
				return t("taskWinWithValue", { value: spec.value });
			}
			return t("taskWinWithAny");
		}
		case "avoid": {
			if (spec.submarines) {
				return t("taskAvoidSub");
			}
			if (spec.suit) {
				return t("taskAvoidSuit", { suit: suitName(spec.suit, t) });
			}
			if (spec.value !== undefined) {
				return t("taskAvoidValue", { value: spec.value });
			}
			if (spec.cards) {
				return t("taskAvoidCards", { cards: formatCards(spec.cards, t) });
			}
			return t("taskAvoid");
		}
		case "trickCount":
			if (spec.op === "exact") {
				return t(countKey(spec.count, "taskTrickCountExactOne", "taskTrickCountExactMany"), {
					count: spec.count,
				});
			}
			if (spec.op === "atLeast") {
				return t(countKey(spec.count, "taskTrickCountAtLeastOne", "taskTrickCountAtLeastMany"), {
					count: spec.count,
				});
			}
			return t(countKey(spec.count, "taskTrickCountAtMostOne", "taskTrickCountAtMostMany"), {
				count: spec.count,
			});
		case "consecutiveTricks":
			return t("taskConsecutive", { count: spec.count });
		case "nthTrick":
			return spec.n === 0 ? t("taskLastTrick") : t("taskNthTrick", { n: spec.n });
		case "compareTricks": {
			const target = spec.vs === "captain" ? t("theCaptain") : t("eachOtherPlayer");
			if (spec.op === "moreThan") {
				return t("taskMoreThan", { target });
			}
			if (spec.op === "fewerThan") {
				return t("taskFewerThan", { target });
			}
			return t("taskSameAs", { target });
		}
		case "trickSum": {
			const key = spec.op === "gt" ? "taskSumGt" : spec.op === "lt" ? "taskSumLt" : "taskSumEq";
			const subNote = spec.noSubmarines ? t("taskNoSubmarines") : "";
			return `${t(key, { target: spec.target })}${subNote}`;
		}
		case "trickFilter": {
			const subNote = spec.noSubmarines ? t("taskNoSubmarines") : "";
			if (spec.filter === "allGt" && spec.bound !== undefined) {
				return `${t("taskFilterGt", { bound: spec.bound })}${subNote}`;
			}
			if (spec.filter === "allLt" && spec.bound !== undefined) {
				return `${t("taskFilterLt", { bound: spec.bound })}${subNote}`;
			}
			if (spec.filter === "allOdd") {
				return `${t("taskFilterOdd")}${subNote}`;
			}
			return `${t("taskFilterEven")}${subNote}`;
		}
		case "collectAllColors":
			return t("taskCollectAllColors");
		case "collectAllOfOneColor":
			return t("taskCollectAllOfOneColor");
		case "collectMoreColor":
			return t("taskCollectMore", {
				more: suitName(spec.more, t),
				less: suitName(spec.less, t),
			});
	}
}

export function cardLabel(cardId: CardId, t: Translate): string {
	return formatCard(cardId, t);
}
