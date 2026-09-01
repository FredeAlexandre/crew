import type { CardId, ColorSuit, DifficultyByPlayers, SeatId, Suit } from "@crew/protocol";
import { colorValueSum, remainingTricks } from "../deal.ts";
import { COLOR_SUITS, parseCard } from "../deck.ts";
import type { EngineState, TaskInstance, TrickPlay } from "../state.ts";

export type EvalContext = {
	owner: SeatId;
	trickId: number;
	winnerSeat: SeatId;
	ledSuit: Suit;
	trick: readonly TrickPlay[];
	winningCardId: CardId;
	captured: readonly CardId[][];
	tricksWon: readonly number[][];
	consecutiveWins: readonly number[];
	hands: readonly CardId[][];
	captainSeat: SeatId;
	remainingTricks: number;
	noMoreTricks: boolean;
	playerCount: number;
};

type TaskVerdict = "open" | "completed" | "failed";

type TaskEval = {
	verdict: TaskVerdict;
	progress: number;
};

export function contextAfterTrick(
	state: EngineState,
	trick: readonly TrickPlay[],
	winnerSeat: SeatId,
	ledSuit: Suit,
): EvalContext {
	const winning = trick.find((play) => play.seatId === winnerSeat);
	if (winning === undefined || state.captainSeat === null) {
		throw new Error("trick context missing winner or captain");
	}
	const remain = remainingTricks(state.hands);
	return {
		owner: 0,
		trickId: state.trickId,
		winnerSeat,
		ledSuit,
		trick,
		winningCardId: winning.cardId,
		captured: state.captured,
		tricksWon: state.tricksWon,
		consecutiveWins: state.consecutiveWins,
		hands: state.hands,
		captainSeat: state.captainSeat,
		remainingTricks: remain,
		noMoreTricks: remain === 0,
		playerCount: state.playerCount,
	};
}

function capturedOf(ctx: EvalContext, seat: SeatId): readonly CardId[] {
	return ctx.captured[seat] ?? [];
}

function inHands(ctx: EvalContext): CardId[] {
	return ctx.hands.flat();
}

function countWhere(ids: readonly CardId[], pred: (id: CardId) => boolean): number {
	return ids.reduce((n, id) => n + (pred(id) ? 1 : 0), 0);
}

function isColorValue(id: CardId, value: number): boolean {
	const card = parseCard(id);
	return card.suit !== "submarine" && card.value === value;
}

function matchesAvoid(id: CardId, spec: Extract<TaskInstance["spec"], { kind: "avoid" }>): boolean {
	const card = parseCard(id);
	if (spec.cards?.includes(id) === true) {
		return true;
	}
	if (spec.suit !== undefined && card.suit === spec.suit) {
		return true;
	}
	if (spec.suits?.includes(card.suit as ColorSuit) === true && card.suit !== "submarine") {
		return true;
	}
	if (spec.value !== undefined && card.suit !== "submarine" && card.value === spec.value) {
		return true;
	}
	if (spec.values?.includes(card.value) === true && card.suit !== "submarine") {
		return true;
	}
	if (spec.submarines === true && card.suit === "submarine") {
		return true;
	}
	return false;
}

function matchesWinWith(
	id: CardId,
	spec: Extract<TaskInstance["spec"], { kind: "winWith" }>,
): boolean {
	const card = parseCard(id);
	if (spec.card !== undefined) {
		return id === spec.card;
	}
	if (spec.suit !== undefined && spec.value !== undefined) {
		return card.suit === spec.suit && card.value === spec.value;
	}
	if (spec.suit !== undefined) {
		return card.suit === spec.suit;
	}
	if (spec.value !== undefined) {
		return card.suit !== "submarine" && card.value === spec.value;
	}
	return false;
}

function trickCaptures(
	spec: Extract<TaskInstance["spec"], { kind: "winWith" }>,
	trick: readonly TrickPlay[],
	winningCardId: CardId,
): boolean {
	const ids = trick.map((play) => play.cardId);
	if (spec.captureCard !== undefined) {
		return ids.includes(spec.captureCard);
	}
	if (spec.captureValue === undefined) {
		return true;
	}
	const matches = ids.filter((id) => isColorValue(id, spec.captureValue ?? -1));
	if (matches.length === 0) {
		return false;
	}
	if (spec.value === spec.captureValue || spec.card !== undefined) {
		return matches.some((id) => id !== winningCardId);
	}
	return true;
}

function compare(op: "gt" | "lt" | "eq", left: number, right: number): boolean {
	if (op === "gt") {
		return left > right;
	}
	if (op === "lt") {
		return left < right;
	}
	return left === right;
}

function resolveTargets(
	target: number | DifficultyByPlayers | undefined,
	targets: readonly number[] | undefined,
	playerCount: number,
): number[] {
	if (targets !== undefined && targets.length > 0) {
		return [...targets];
	}
	if (target === undefined) {
		return [];
	}
	if (typeof target === "number") {
		return [target];
	}
	const keyed = playerCount === 3 || playerCount === 4 || playerCount === 5 ? playerCount : 4;
	return [target[keyed]];
}

function trickHasSubmarine(trick: readonly TrickPlay[]): boolean {
	return trick.some((play) => parseCard(play.cardId).suit === "submarine");
}

function colorCardsInTrick(trick: readonly TrickPlay[]): CardId[] {
	return trick.map((play) => play.cardId).filter((id) => parseCard(id).suit !== "submarine");
}

function ownedWon(ctx: EvalContext): number {
	return ctx.tricksWon[ctx.owner]?.length ?? 0;
}

function isLastTrick(ctx: EvalContext): boolean {
	return ctx.noMoreTricks;
}

function evaluateWinCards(task: TaskInstance, ctx: EvalContext): TaskEval {
	const spec = task.spec;
	if (spec.kind !== "winCards") {
		return { verdict: "open", progress: 0 };
	}
	const owned = capturedOf(ctx, ctx.owner);
	const got = spec.cards.filter((card) => owned.includes(card));
	const progress = got.length;
	const inThisTrick = spec.cards.filter((card) => ctx.trick.some((play) => play.cardId === card));
	const targetTrick = spec.inTrick;
	if (targetTrick !== undefined) {
		const thisIsTarget = targetTrick === 0 ? isLastTrick(ctx) : ctx.trickId === targetTrick;
		if (inThisTrick.length > 0 && !thisIsTarget) {
			return { verdict: "failed", progress };
		}
		if (thisIsTarget) {
			const wonHere = ctx.winnerSeat === ctx.owner && inThisTrick.length === spec.cards.length;
			return {
				verdict: wonHere ? "completed" : "failed",
				progress: wonHere ? spec.cards.length : 0,
			};
		}
		const elsewhere = spec.cards.filter(
			(card) => !owned.includes(card) && !inHands(ctx).includes(card),
		);
		if (elsewhere.length > 0) {
			return { verdict: "failed", progress };
		}
		if (ctx.noMoreTricks) {
			return { verdict: "failed", progress };
		}
		return { verdict: "open", progress };
	}
	if (got.length === spec.cards.length) {
		return { verdict: "completed", progress };
	}
	const elsewhere = spec.cards.filter(
		(card) => !owned.includes(card) && !inHands(ctx).includes(card),
	);
	if (elsewhere.length > 0) {
		return { verdict: "failed", progress };
	}
	if (ctx.noMoreTricks) {
		return { verdict: "failed", progress };
	}
	return { verdict: "open", progress };
}

function evaluateCountCards(
	ctx: EvalContext,
	need: number,
	pred: (id: CardId) => boolean,
	op: "exact" | "atLeast" = "atLeast",
): TaskEval {
	const owned = countWhere(capturedOf(ctx, ctx.owner), pred);
	const available = owned + countWhere(inHands(ctx), pred);
	if (op === "exact") {
		if (owned > need) {
			return { verdict: "failed", progress: owned };
		}
		if (available < need) {
			return { verdict: "failed", progress: owned };
		}
		if (ctx.noMoreTricks) {
			return { verdict: owned === need ? "completed" : "failed", progress: owned };
		}
		return { verdict: "open", progress: owned };
	}
	if (owned >= need) {
		return { verdict: "completed", progress: owned };
	}
	if (ctx.noMoreTricks || available < need) {
		return { verdict: "failed", progress: owned };
	}
	return { verdict: "open", progress: owned };
}

function evaluateWinColors(task: TaskInstance, ctx: EvalContext): TaskEval {
	const spec = task.spec;
	if (spec.kind !== "winColors") {
		return { verdict: "open", progress: 0 };
	}
	const results = spec.parts.map((part) =>
		evaluateCountCards(ctx, part.count, (id) => parseCard(id).suit === part.suit, part.op),
	);
	if (results.some((result) => result.verdict === "failed")) {
		return { verdict: "failed", progress: 0 };
	}
	if (results.every((result) => result.verdict === "completed")) {
		return { verdict: "completed", progress: 1 };
	}
	return { verdict: "open", progress: 0 };
}

function evaluateWinSubmarines(task: TaskInstance, ctx: EvalContext): TaskEval {
	const spec = task.spec;
	if (spec.kind !== "winSubmarines") {
		return { verdict: "open", progress: 0 };
	}
	const isSub = (id: CardId) => parseCard(id).suit === "submarine";
	if (spec.onlyCard !== undefined) {
		const owned = capturedOf(ctx, ctx.owner);
		const hasOnly = owned.includes(spec.onlyCard);
		const otherSubs = owned.filter((id) => isSub(id) && id !== spec.onlyCard);
		if (otherSubs.length > 0) {
			return { verdict: "failed", progress: 0 };
		}
		if (hasOnly) {
			return { verdict: "completed", progress: 1 };
		}
		if (!inHands(ctx).includes(spec.onlyCard) || ctx.noMoreTricks) {
			return { verdict: "failed", progress: 0 };
		}
		return { verdict: "open", progress: 0 };
	}
	return evaluateCountCards(ctx, spec.count, isSub, spec.op ?? "atLeast");
}

function evaluateAvoid(task: TaskInstance, ctx: EvalContext): TaskEval {
	const spec = task.spec;
	if (spec.kind !== "avoid") {
		return { verdict: "open", progress: 0 };
	}
	const ownedBad = capturedOf(ctx, ctx.owner).filter((id) => matchesAvoid(id, spec));
	if (ownedBad.length > 0) {
		return { verdict: "failed", progress: 0 };
	}
	const remainingBad = countWhere(inHands(ctx), (id) => matchesAvoid(id, spec));
	if (ctx.noMoreTricks || remainingBad === 0) {
		return { verdict: "completed", progress: 1 };
	}
	return { verdict: "open", progress: 0 };
}

function evaluateTrickCount(task: TaskInstance, ctx: EvalContext): TaskEval {
	const spec = task.spec;
	if (spec.kind !== "trickCount" && spec.kind !== "predictTricks") {
		return { verdict: "open", progress: 0 };
	}
	const need = spec.kind === "predictTricks" ? (task.prediction ?? -1) : spec.count;
	const op = spec.kind === "predictTricks" ? ("exact" as const) : spec.op;
	if (need < 0) {
		return { verdict: ctx.noMoreTricks ? "failed" : "open", progress: ownedWon(ctx) };
	}
	const won = ownedWon(ctx);
	const remain = ctx.remainingTricks;
	if (op === "atLeast") {
		if (won >= need) {
			return { verdict: "completed", progress: won };
		}
		if (won + remain < need) {
			return { verdict: "failed", progress: won };
		}
		return { verdict: "open", progress: won };
	}
	if (op === "atMost") {
		if (won > need) {
			return { verdict: "failed", progress: won };
		}
		if (ctx.noMoreTricks) {
			return { verdict: "completed", progress: won };
		}
		return { verdict: "open", progress: won };
	}
	if (won > need) {
		return { verdict: "failed", progress: won };
	}
	if (won + remain < need) {
		return { verdict: "failed", progress: won };
	}
	if (ctx.noMoreTricks && won === need) {
		return { verdict: "completed", progress: won };
	}
	return { verdict: "open", progress: won };
}

function evaluateCompare(task: TaskInstance, ctx: EvalContext): TaskEval {
	const spec = task.spec;
	if (spec.kind !== "compareTricks") {
		return { verdict: "open", progress: 0 };
	}
	const ownerWon = ownedWon(ctx);
	const remain = ctx.remainingTricks;
	if (spec.vs === "captain" && ctx.owner === ctx.captainSeat) {
		return { verdict: "failed", progress: ownerWon };
	}
	if (spec.vs === "othersCombined") {
		const others = Array.from({ length: ctx.playerCount }, (_, seat) =>
			seat === ctx.owner ? 0 : (ctx.tricksWon[seat]?.length ?? 0),
		).reduce((sum, n) => sum + n, 0);
		if (spec.op === "moreThan") {
			if (ownerWon > others + remain) {
				return { verdict: "completed", progress: ownerWon };
			}
			if (ownerWon + remain <= others) {
				return { verdict: "failed", progress: ownerWon };
			}
			if (ctx.noMoreTricks) {
				return { verdict: ownerWon > others ? "completed" : "failed", progress: ownerWon };
			}
			return { verdict: "open", progress: ownerWon };
		}
	}
	const others: number[] =
		spec.vs === "captain"
			? [ctx.tricksWon[ctx.captainSeat]?.length ?? 0]
			: Array.from({ length: ctx.playerCount }, (_, seat) =>
					seat === ctx.owner ? -1 : (ctx.tricksWon[seat]?.length ?? 0),
				).filter((n) => n >= 0);

	const holds = (): boolean => {
		if (spec.op === "moreThan") {
			return others.every((other) => ownerWon > other);
		}
		if (spec.op === "fewerThan") {
			return others.every((other) => ownerWon < other);
		}
		return others.every((other) => ownerWon === other);
	};

	const failNow = (): boolean => {
		if (spec.op === "moreThan") {
			return others.some((other) => ownerWon + remain <= other);
		}
		if (spec.op === "fewerThan") {
			return others.some((other) => ownerWon >= other + remain);
		}
		return others.some((other) => Math.abs(ownerWon - other) > remain);
	};

	const completeNow = (): boolean => {
		if (spec.op === "moreThan") {
			return others.every((other) => ownerWon > other + remain);
		}
		if (spec.op === "fewerThan") {
			return others.every((other) => ownerWon + remain < other);
		}
		return ctx.noMoreTricks && holds();
	};

	if (failNow()) {
		return { verdict: "failed", progress: ownerWon };
	}
	if (completeNow() || (ctx.noMoreTricks && holds())) {
		return { verdict: "completed", progress: ownerWon };
	}
	return { verdict: "open", progress: ownerWon };
}

function evaluateThisTrickCondition(
	matched: boolean,
	ctx: EvalContext,
	progress: number,
): TaskEval {
	if (matched) {
		return { verdict: "completed", progress };
	}
	if (ctx.noMoreTricks) {
		return { verdict: "failed", progress };
	}
	return { verdict: "open", progress };
}

function evaluateCollection(task: TaskInstance, ctx: EvalContext): TaskEval {
	const spec = task.spec;
	const owned = capturedOf(ctx, ctx.owner);
	if (spec.kind === "collectAllColors") {
		const colors = new Set(
			owned
				.map((id) => parseCard(id).suit)
				.filter((suit): suit is ColorSuit => suit !== "submarine"),
		);
		const progress = colors.size;
		if (progress === 4) {
			return { verdict: "completed", progress };
		}
		const remainingColors = new Set(
			inHands(ctx)
				.map((id) => parseCard(id).suit)
				.filter((suit): suit is ColorSuit => suit !== "submarine"),
		);
		for (const color of COLOR_SUITS) {
			if (!colors.has(color) && !remainingColors.has(color)) {
				return { verdict: "failed", progress };
			}
		}
		if (ctx.noMoreTricks) {
			return { verdict: "failed", progress };
		}
		return { verdict: "open", progress };
	}
	if (spec.kind === "collectAllOfOneColor") {
		const complete = COLOR_SUITS.some(
			(suit) => countWhere(owned, (id) => parseCard(id).suit === suit) === 9,
		);
		if (complete) {
			return { verdict: "completed", progress: 9 };
		}
		const possible = COLOR_SUITS.some((suit) => {
			const have = countWhere(owned, (id) => parseCard(id).suit === suit);
			const rest = countWhere(inHands(ctx), (id) => parseCard(id).suit === suit);
			return have + rest >= 9;
		});
		if (!possible || ctx.noMoreTricks) {
			return { verdict: "failed", progress: 0 };
		}
		return { verdict: "open", progress: 0 };
	}
	if (spec.kind === "collectMoreColor") {
		const more = countWhere(owned, (id) => parseCard(id).suit === spec.more);
		const less = countWhere(owned, (id) => parseCard(id).suit === spec.less);
		const moreLeft = countWhere(inHands(ctx), (id) => parseCard(id).suit === spec.more);
		const lessLeft = countWhere(inHands(ctx), (id) => parseCard(id).suit === spec.less);
		if (more > less + lessLeft) {
			return { verdict: "completed", progress: more };
		}
		if (more + moreLeft <= less) {
			return { verdict: "failed", progress: more };
		}
		if (ctx.noMoreTricks) {
			return { verdict: more > less ? "completed" : "failed", progress: more };
		}
		return { verdict: "open", progress: more };
	}
	if (spec.kind === "collectEqualColor") {
		if (spec.inTrick) {
			if (ctx.winnerSeat !== ctx.owner) {
				return evaluateThisTrickCondition(false, ctx, 0);
			}
			const a = countWhere(
				ctx.trick.map((play) => play.cardId),
				(id) => parseCard(id).suit === spec.a,
			);
			const b = countWhere(
				ctx.trick.map((play) => play.cardId),
				(id) => parseCard(id).suit === spec.b,
			);
			const matched = a > 0 && a === b;
			return evaluateThisTrickCondition(matched, ctx, matched ? a : 0);
		}
		const a = countWhere(owned, (id) => parseCard(id).suit === spec.a);
		const b = countWhere(owned, (id) => parseCard(id).suit === spec.b);
		const aLeft = countWhere(inHands(ctx), (id) => parseCard(id).suit === spec.a);
		const bLeft = countWhere(inHands(ctx), (id) => parseCard(id).suit === spec.b);
		if (a === 0 && b === 0 && aLeft === 0 && bLeft === 0) {
			return { verdict: "failed", progress: 0 };
		}
		const canEqual =
			Math.max(a, b) <= Math.min(a + aLeft, b + bLeft) && Math.min(a + aLeft, b + bLeft) > 0;
		if (!canEqual) {
			return { verdict: "failed", progress: a };
		}
		if (ctx.noMoreTricks) {
			return { verdict: a > 0 && a === b ? "completed" : "failed", progress: a };
		}
		return { verdict: "open", progress: a };
	}
	return { verdict: "open", progress: 0 };
}

function trickFilterHolds(
	spec: Extract<TaskInstance["spec"], { kind: "trickFilter" }>,
	trick: readonly TrickPlay[],
): boolean {
	if (spec.noSubmarines && trickHasSubmarine(trick)) {
		return false;
	}
	const colors = colorCardsInTrick(trick);
	if (colors.length === 0) {
		return false;
	}
	if (spec.filter === "allOdd") {
		return colors.every((id) => parseCard(id).value % 2 === 1);
	}
	if (spec.filter === "allEven") {
		return colors.every((id) => parseCard(id).value % 2 === 0);
	}
	const bound = spec.bound ?? 0;
	if (spec.filter === "allGt") {
		return colors.every((id) => parseCard(id).value > bound);
	}
	return colors.every((id) => parseCard(id).value < bound);
}

function evaluateConsecutive(task: TaskInstance, ctx: EvalContext): TaskEval {
	const spec = task.spec;
	if (spec.kind !== "consecutiveTricks") {
		return { verdict: "open", progress: 0 };
	}
	const op = spec.op ?? "atLeast";
	const streak = ctx.consecutiveWins[ctx.owner] ?? 0;
	const won = ownedWon(ctx);
	if (op === "none") {
		if (streak >= spec.count) {
			return { verdict: "failed", progress: streak };
		}
		if (ctx.noMoreTricks) {
			return { verdict: "completed", progress: streak };
		}
		return { verdict: "open", progress: streak };
	}
	if (op === "exact") {
		if (won > spec.count) {
			return { verdict: "failed", progress: won };
		}
		if (ctx.noMoreTricks) {
			const consecutive = won === spec.count && streak === spec.count;
			return { verdict: consecutive ? "completed" : "failed", progress: won };
		}
		if (won + ctx.remainingTricks < spec.count) {
			return { verdict: "failed", progress: won };
		}
		return { verdict: "open", progress: streak };
	}
	if (streak >= spec.count) {
		return { verdict: "completed", progress: streak };
	}
	if (streak + ctx.remainingTricks < spec.count) {
		return { verdict: "failed", progress: streak };
	}
	return { verdict: "open", progress: streak };
}

function evaluateNthTrick(task: TaskInstance, ctx: EvalContext): TaskEval {
	const spec = task.spec;
	if (spec.kind !== "nthTrick") {
		return { verdict: "open", progress: 0 };
	}
	const span = spec.count ?? 1;
	const won = ownedWon(ctx);
	const ownerWonThis = ctx.winnerSeat === ctx.owner;

	if (spec.n === 0) {
		if (!isLastTrick(ctx)) {
			if (spec.only === true && ownerWonThis) {
				return { verdict: "failed", progress: 0 };
			}
			return { verdict: "open", progress: 0 };
		}
		if (!ownerWonThis) {
			return { verdict: "failed", progress: 0 };
		}
		if (spec.only === true && won !== 1) {
			return { verdict: "failed", progress: won };
		}
		return { verdict: "completed", progress: 1 };
	}

	const lastOfSpan = spec.n + span - 1;
	if (ctx.trickId < spec.n) {
		return { verdict: "open", progress: 0 };
	}
	if (ctx.trickId >= spec.n && ctx.trickId <= lastOfSpan) {
		if (!ownerWonThis) {
			return { verdict: "failed", progress: 0 };
		}
		if (ctx.trickId < lastOfSpan) {
			return { verdict: "open", progress: ctx.trickId - spec.n + 1 };
		}
		if (spec.alsoLast === true || spec.only === true) {
			return { verdict: "open", progress: span };
		}
		return { verdict: "completed", progress: span };
	}
	if (spec.alsoLast === true) {
		if (isLastTrick(ctx)) {
			return {
				verdict: ownerWonThis ? "completed" : "failed",
				progress: ownerWonThis ? span + 1 : span,
			};
		}
		return { verdict: "open", progress: span };
	}
	if (spec.only === true) {
		if (ownerWonThis) {
			return { verdict: "failed", progress: won };
		}
		if (ctx.noMoreTricks) {
			return { verdict: "completed", progress: span };
		}
		return { verdict: "open", progress: span };
	}
	return { verdict: "failed", progress: 0 };
}

function evaluateSkipFirst(task: TaskInstance, ctx: EvalContext): TaskEval {
	const spec = task.spec;
	if (spec.kind !== "skipFirstTricks") {
		return { verdict: "open", progress: 0 };
	}
	if (ctx.trickId <= spec.count && ctx.winnerSeat === ctx.owner) {
		return { verdict: "failed", progress: 0 };
	}
	if (ctx.trickId >= spec.count) {
		return { verdict: "completed", progress: 1 };
	}
	return { verdict: "open", progress: 0 };
}

function evaluateNoLead(task: TaskInstance, ctx: EvalContext): TaskEval {
	const spec = task.spec;
	if (spec.kind !== "noLead") {
		return { verdict: "open", progress: 0 };
	}
	const lead = ctx.trick[0];
	if (lead !== undefined && lead.seatId === ctx.owner) {
		const suit = parseCard(lead.cardId).suit;
		if (suit !== "submarine" && spec.suits.includes(suit)) {
			return { verdict: "failed", progress: 0 };
		}
	}
	if (ctx.noMoreTricks) {
		return { verdict: "completed", progress: 1 };
	}
	return { verdict: "open", progress: 0 };
}

export function evaluateTask(task: TaskInstance, ctx: EvalContext): TaskEval {
	const spec = task.spec;
	switch (spec.kind) {
		case "winCards":
			return evaluateWinCards(task, ctx);
		case "winColor":
			return evaluateCountCards(
				ctx,
				spec.count,
				(id) => parseCard(id).suit === spec.suit,
				spec.op ?? "atLeast",
			);
		case "winColors":
			return evaluateWinColors(task, ctx);
		case "winValue":
			return evaluateCountCards(
				ctx,
				spec.count,
				(id) => isColorValue(id, spec.value),
				spec.op ?? "atLeast",
			);
		case "winSubmarines":
			return evaluateWinSubmarines(task, ctx);
		case "winWith": {
			const matched =
				ctx.winnerSeat === ctx.owner &&
				matchesWinWith(ctx.winningCardId, spec) &&
				trickCaptures(spec, ctx.trick, ctx.winningCardId);
			if (matched) {
				return { verdict: "completed", progress: 1 };
			}
			const captureInTrick =
				spec.captureCard !== undefined &&
				ctx.trick.some((play) => play.cardId === spec.captureCard);
			if (captureInTrick) {
				return { verdict: "failed", progress: 0 };
			}
			const stillHas = (ctx.hands[ctx.owner] ?? []).some((id) => matchesWinWith(id, spec));
			const captureGone =
				spec.captureCard !== undefined && !inHands(ctx).includes(spec.captureCard);
			if (!stillHas || captureGone) {
				return { verdict: "failed", progress: 0 };
			}
			return evaluateThisTrickCondition(false, ctx, 0);
		}
		case "avoid":
			return evaluateAvoid(task, ctx);
		case "trickCount":
		case "predictTricks":
			return evaluateTrickCount(task, ctx);
		case "consecutiveTricks":
			return evaluateConsecutive(task, ctx);
		case "nthTrick":
			return evaluateNthTrick(task, ctx);
		case "skipFirstTricks":
			return evaluateSkipFirst(task, ctx);
		case "compareTricks":
			return evaluateCompare(task, ctx);
		case "trickSum": {
			const banned = spec.noSubmarines && trickHasSubmarine(ctx.trick);
			const sum = colorValueSum(ctx.trick.map((play) => play.cardId));
			const bounds = resolveTargets(spec.target, spec.targets, ctx.playerCount);
			const hit = bounds.some((bound) => compare(spec.op, sum, bound));
			const matched = !banned && ctx.winnerSeat === ctx.owner && hit;
			return evaluateThisTrickCondition(matched, ctx, matched ? sum : 0);
		}
		case "trickFilter": {
			const matched = ctx.winnerSeat === ctx.owner && trickFilterHolds(spec, ctx.trick);
			return evaluateThisTrickCondition(matched, ctx, matched ? 1 : 0);
		}
		case "collectAllColors":
		case "collectAllOfOneColor":
		case "collectMoreColor":
		case "collectEqualColor":
			return evaluateCollection(task, ctx);
		case "noLead":
			return evaluateNoLead(task, ctx);
	}
}

export function evaluateOpenTasks(
	state: EngineState,
	ctxBase: Omit<EvalContext, "owner">,
): { failed: TaskInstance | null; events: { instance: TaskInstance; eval: TaskEval }[] } {
	const events: { instance: TaskInstance; eval: TaskEval }[] = [];
	for (const task of state.tasks) {
		if (task.status !== "open" || task.ownerSeat === null) {
			continue;
		}
		const result = evaluateTask(task, { ...ctxBase, owner: task.ownerSeat });
		events.push({ instance: task, eval: result });
		if (result.verdict === "failed") {
			return { failed: task, events };
		}
	}
	return { failed: null, events };
}
