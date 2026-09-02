import {
	type CardId,
	type PlayerCount,
	type Suit,
	splitCardId,
	type TaskPublic,
} from "@crew/protocol";
import type { Translate } from "../../lib/i18n.tsx";

export type TaskRenderParams = {
	playerCount?: PlayerCount;
};

export function taskRenderParams(playerCount: number): TaskRenderParams {
	if (playerCount === 3 || playerCount === 4 || playerCount === 5) {
		return { playerCount };
	}
	return {};
}

export function trickSumBound(
	spec: Extract<TaskPublic, { kind: "trickSum" }>,
	params?: TaskRenderParams,
): string {
	if (spec.targets !== undefined) {
		return spec.targets.join("/");
	}
	if (typeof spec.target === "number") {
		return String(spec.target);
	}
	if (spec.target === undefined) {
		return "";
	}
	if (params?.playerCount !== undefined) {
		return String(spec.target[params.playerCount]);
	}
	return `${spec.target[3]}/${spec.target[4]}/${spec.target[5]}`;
}

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

export function taskCatalogLabel(
	spec: TaskPublic,
	t: Translate,
	params?: TaskRenderParams,
): string {
	switch (spec.kind) {
		case "winCards":
			if (spec.inTrick === 0) {
				return t("taskWinCardsLast", { cards: formatCards(spec.cards, t) });
			}
			return t("taskWinCards", { cards: formatCards(spec.cards, t) });
		case "winColor": {
			const exact = spec.op === "exact";
			return t(
				countKey(
					spec.count,
					exact ? "taskWinColorExactOne" : "taskWinColorAtLeastOne",
					exact ? "taskWinColorExactMany" : "taskWinColorAtLeastMany",
				),
				{ count: spec.count, suit: suitName(spec.suit, t) },
			);
		}
		case "winColors":
			return t("taskWinColors", {
				parts: spec.parts
					.map((part) =>
						t(countKey(part.count, "taskColorPartOne", "taskColorPartMany"), {
							count: part.count,
							suit: suitName(part.suit, t),
						}),
					)
					.join(t("taskColorPartJoin")),
			});
		case "winValue": {
			const exact = spec.op === "exact";
			return t(
				countKey(
					spec.count,
					exact ? "taskWinValueExactOne" : "taskWinValueAtLeastOne",
					exact ? "taskWinValueExactMany" : "taskWinValueAtLeastMany",
				),
				{ count: spec.count, value: spec.value },
			);
		}
		case "winSubmarines":
			if (spec.onlyCard) {
				return t("taskWinSubOnly", { card: formatCard(spec.onlyCard, t) });
			}
			return t(
				countKey(
					spec.count,
					spec.op === "exact" ? "taskWinSubExactOne" : "taskWinSubAtLeastOne",
					spec.op === "exact" ? "taskWinSubExactMany" : "taskWinSubAtLeastMany",
				),
				{ count: spec.count },
			);
		case "winWith": {
			if (spec.captureCard && spec.suit) {
				return t("taskWinCaptureWithSuit", {
					card: formatCard(spec.captureCard, t),
					suit: suitName(spec.suit, t),
				});
			}
			if (spec.captureValue !== undefined && spec.value !== undefined) {
				return t("taskWinCaptureValueWithValue", {
					capture: spec.captureValue,
					value: spec.value,
				});
			}
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
			if (spec.suits && spec.suits.length > 0) {
				return t("taskAvoidSuits", {
					suits: spec.suits.map((suit) => suitName(suit, t)).join(t("taskColorPartJoin")),
				});
			}
			if (spec.suit) {
				return t("taskAvoidSuit", { suit: suitName(spec.suit, t) });
			}
			if (spec.values && spec.values.length > 0) {
				return t("taskAvoidValues", { values: spec.values.join(t("taskColorPartJoin")) });
			}
			if (spec.value !== undefined) {
				return t("taskAvoidValue", { value: spec.value });
			}
			if (spec.cards) {
				return t("taskAvoidCards", { cards: formatCards(spec.cards, t) });
			}
			return t("taskAvoid");
		}
		case "noLead":
			return t("taskNoLead", {
				suits: spec.suits.map((suit) => suitName(suit, t)).join(t("taskColorPartJoin")),
			});
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
		case "predictTricks":
			return spec.reveal === "hidden" ? t("taskPredictHidden") : t("taskPredictOpen");
		case "consecutiveTricks":
			if (spec.op === "none") {
				return t("taskConsecutiveNone", { count: spec.count });
			}
			if (spec.op === "exact") {
				return t("taskConsecutiveExact", { count: spec.count });
			}
			return t("taskConsecutive", { count: spec.count });
		case "nthTrick": {
			if (spec.only === true && spec.n === 0) {
				return t("taskOnlyLastTrick");
			}
			if (spec.only === true && spec.n === 1) {
				return t("taskOnlyFirstTrick");
			}
			if (spec.alsoLast === true) {
				return t("taskFirstAndLast");
			}
			if ((spec.count ?? 1) > 1 && spec.n === 1) {
				return t("taskFirstNTricks", { count: spec.count ?? 1 });
			}
			return spec.n === 0 ? t("taskLastTrick") : t("taskNthTrick", { n: spec.n });
		}
		case "skipFirstTricks":
			return t("taskSkipFirst", { count: spec.count });
		case "compareTricks": {
			if (spec.vs === "othersCombined") {
				return spec.op === "moreThan" ? t("taskMoreThanCombined") : t("taskFewerThanCombined");
			}
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
			return `${t(key, { target: trickSumBound(spec, params) })}${subNote}`;
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
		case "collectEqualColor":
			return t(spec.inTrick ? "taskCollectEqualInTrick" : "taskCollectEqual", {
				a: suitName(spec.a, t),
				b: suitName(spec.b, t),
			});
	}
}

export function cardLabel(cardId: CardId, t: Translate): string {
	return formatCard(cardId, t);
}
