import type { CardId, ColorSuit, SeatId, Suit } from "@crew/protocol";
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

function matchesAvoid(id: CardId, spec: Extract<TaskInstance["spec"], { kind: "avoid" }>): boolean {
	const card = parseCard(id);
	if (spec.cards?.includes(id) === true) {
		return true;
	}
	if (spec.suit !== undefined && card.suit === spec.suit) {
		return true;
	}
	if (spec.value !== undefined && card.suit !== "submarine" && card.value === spec.value) {
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

function compare(op: "gt" | "lt" | "eq", left: number, right: number): boolean {
	if (op === "gt") {
		return left > right;
	}
	if (op === "lt") {
		return left < right;
	}
	return left === right;
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

function evaluateWinCards(task: TaskInstance, ctx: EvalContext): TaskEval {
	const spec = task.spec;
	if (spec.kind !== "winCards") {
		return { verdict: "open", progress: 0 };
	}
	const owned = capturedOf(ctx, ctx.owner);
	const got = spec.cards.filter((card) => owned.includes(card));
	const progress = got.length;
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
): TaskEval {
	const owned = countWhere(capturedOf(ctx, ctx.owner), pred);
	const available = owned + countWhere(inHands(ctx), pred);
	if (owned >= need) {
		return { verdict: "completed", progress: owned };
	}
	if (ctx.noMoreTricks || available < need) {
		return { verdict: "failed", progress: owned };
	}
	return { verdict: "open", progress: owned };
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
	if (spec.kind !== "trickCount") {
		return { verdict: "open", progress: 0 };
	}
	const won = ownedWon(ctx);
	const remain = ctx.remainingTricks;
	if (spec.op === "atLeast") {
		if (won >= spec.count) {
			return { verdict: "completed", progress: won };
		}
		if (won + remain < spec.count) {
			return { verdict: "failed", progress: won };
		}
		return { verdict: "open", progress: won };
	}
	if (spec.op === "atMost") {
		if (won > spec.count) {
			return { verdict: "failed", progress: won };
		}
		if (ctx.noMoreTricks) {
			return { verdict: "completed", progress: won };
		}
		return { verdict: "open", progress: won };
	}
	if (won > spec.count) {
		return { verdict: "failed", progress: won };
	}
	if (won + remain < spec.count) {
		return { verdict: "failed", progress: won };
	}
	if (ctx.noMoreTricks && won === spec.count) {
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
	const others: number[] =
		spec.vs === "captain"
			? [ctx.tricksWon[ctx.captainSeat]?.length ?? 0]
			: Array.from({ length: ctx.playerCount }, (_, seat) =>
					seat === ctx.owner ? -1 : (ctx.tricksWon[seat]?.length ?? 0),
				).filter((n) => n >= 0);

	if (spec.vs === "captain" && ctx.owner === ctx.captainSeat) {
		return { verdict: "failed", progress: ownerWon };
	}

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

export function evaluateTask(task: TaskInstance, ctx: EvalContext): TaskEval {
	const spec = task.spec;
	switch (spec.kind) {
		case "winCards":
			return evaluateWinCards(task, ctx);
		case "winColor":
			return evaluateCountCards(ctx, spec.count, (id) => parseCard(id).suit === spec.suit);
		case "winValue":
			return evaluateCountCards(
				ctx,
				spec.count,
				(id) => parseCard(id).suit !== "submarine" && parseCard(id).value === spec.value,
			);
		case "winSubmarines":
			return evaluateCountCards(ctx, spec.count, (id) => parseCard(id).suit === "submarine");
		case "winWith": {
			const matched = ctx.winnerSeat === ctx.owner && matchesWinWith(ctx.winningCardId, spec);
			if (matched) {
				return { verdict: "completed", progress: 1 };
			}
			const stillHas = (ctx.hands[ctx.owner] ?? []).some((id) => matchesWinWith(id, spec));
			if (!stillHas) {
				return { verdict: "failed", progress: 0 };
			}
			return evaluateThisTrickCondition(false, ctx, 0);
		}
		case "avoid":
			return evaluateAvoid(task, ctx);
		case "trickCount":
			return evaluateTrickCount(task, ctx);
		case "consecutiveTricks": {
			const streak = ctx.consecutiveWins[ctx.owner] ?? 0;
			if (streak >= spec.count) {
				return { verdict: "completed", progress: streak };
			}
			if (streak + ctx.remainingTricks < spec.count) {
				return { verdict: "failed", progress: streak };
			}
			return { verdict: "open", progress: streak };
		}
		case "nthTrick": {
			if (spec.n === 0) {
				if (!ctx.noMoreTricks) {
					return { verdict: "open", progress: 0 };
				}
				return {
					verdict: ctx.winnerSeat === ctx.owner ? "completed" : "failed",
					progress: ctx.winnerSeat === ctx.owner ? 1 : 0,
				};
			}
			if (ctx.trickId < spec.n) {
				return { verdict: "open", progress: 0 };
			}
			if (ctx.trickId === spec.n) {
				return {
					verdict: ctx.winnerSeat === ctx.owner ? "completed" : "failed",
					progress: ctx.winnerSeat === ctx.owner ? 1 : 0,
				};
			}
			return { verdict: "failed", progress: 0 };
		}
		case "compareTricks":
			return evaluateCompare(task, ctx);
		case "trickSum": {
			const banned = spec.noSubmarines && trickHasSubmarine(ctx.trick);
			const sum = colorValueSum(ctx.trick.map((play) => play.cardId));
			const matched = !banned && ctx.winnerSeat === ctx.owner && compare(spec.op, sum, spec.target);
			return evaluateThisTrickCondition(matched, ctx, matched ? sum : 0);
		}
		case "trickFilter": {
			const matched = ctx.winnerSeat === ctx.owner && trickFilterHolds(spec, ctx.trick);
			return evaluateThisTrickCondition(matched, ctx, matched ? 1 : 0);
		}
		case "collectAllColors":
		case "collectAllOfOneColor":
		case "collectMoreColor":
			return evaluateCollection(task, ctx);
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
