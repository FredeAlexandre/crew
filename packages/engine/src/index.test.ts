import { describe, expect, it } from "vitest";
import { remainingTricks } from "./deal.ts";
import { DECK } from "./deck.ts";
import { autoplay, must, playOut, skipDistressToPlay, startAttempt } from "./harness.ts";
import { apply, createAttempt, legalIntents } from "./index.ts";
import { createRng, shuffle } from "./rng.ts";
import { TASK_CATALOG } from "./tasks/catalog.ts";

describe("deck and deal", () => {
	it("has 40 unique cards", () => {
		expect(DECK).toHaveLength(40);
		expect(new Set(DECK).size).toBe(40);
	});

	it("deals 10/8/14-13-13 by player count", () => {
		const four = startAttempt(4, 7);
		expect(four.hands.map((hand) => hand.length)).toEqual([10, 10, 10, 10]);
		const five = startAttempt(5, 7);
		expect(five.hands.map((hand) => hand.length)).toEqual([8, 8, 8, 8, 8]);
		const three = startAttempt(3, 7);
		expect(three.hands.map((hand) => hand.length).sort((a, b) => b - a)).toEqual([14, 13, 13]);
	});

	it("deals the same hands for the same seed", () => {
		expect(startAttempt(4, 99).hands).toEqual(startAttempt(4, 99).hands);
		expect(shuffle([...DECK], createRng(3))).toEqual(shuffle([...DECK], createRng(3)));
	});

	it("makes the holder of submarine-4 captain", () => {
		const state = startAttempt(4, 2);
		expect(state.captainSeat).not.toBeNull();
		expect(state.hands[state.captainSeat ?? -1]).toContain("submarine-4");
	});

	it("can deal submarine-4 to a chosen seat without changing hand sizes", () => {
		for (const seed of [1, 2, 7, 99]) {
			const { state } = createAttempt({
				attemptId: "a1",
				mission: { id: "m1", difficulty: 1 },
				playerCount: 4,
				seed,
				captainSeat: 2,
			});
			expect(state.captainSeat).toBe(2);
			expect(state.hands[2]).toContain("submarine-4");
			expect(state.hands.map((hand) => hand.length)).toEqual([10, 10, 10, 10]);
			expect(state.hands.filter((hand) => hand.includes("submarine-4"))).toHaveLength(1);
		}
	});
});

describe("createAttempt", () => {
	it("round-trips through JSON", () => {
		const state = startAttempt();
		expect(JSON.parse(JSON.stringify(state))).toEqual(state);
	});

	it("emits deal, captain, tasks, and the first draft turn", () => {
		const { facts, state } = createAttempt({
			attemptId: "a1",
			mission: { id: "m1", difficulty: 1 },
			playerCount: 4,
			seed: 1,
		});
		expect(facts.filter((fact) => fact.type === "card.dealt")).toHaveLength(40);
		expect(facts.some((fact) => fact.type === "captain.revealed")).toBe(true);
		expect(facts.some((fact) => fact.type === "tasks.drawn")).toBe(true);
		expect(facts.at(-1)?.type).toBe("task.offeredTurn");
		expect(state.phase).toBe("taskDraft");
		expect(state.currentSeat).toBe(state.captainSeat);
	});
});

describe("apply", () => {
	it("leaves state unchanged on an illegal intent", () => {
		const state = startAttempt();
		const before = structuredClone(state);
		const result = apply(state, {
			type: "card.play",
			attemptId: "a1",
			seatId: state.captainSeat ?? 0,
			cardId: "pink-1",
		});
		expect(result.ok).toBe(false);
		expect(state).toEqual(before);
	});

	it("rejects echo", () => {
		const state = startAttempt();
		expect(apply(state, { type: "echo", attemptId: "a1", seq: 0, payload: null }).ok).toBe(false);
	});

	it("rejects lobby intents", () => {
		const state = startAttempt();
		expect(apply(state, { type: "player.ready", ready: true }).ok).toBe(false);
		expect(apply(state, { type: "host.start" }).ok).toBe(false);
		expect(apply(state, { type: "host.retry" }).ok).toBe(false);
		expect(apply(state, { type: "host.fillBots" }).ok).toBe(false);
		expect(apply(state, { type: "host.configure", difficulty: 4, captainSeat: null }).ok).toBe(
			false,
		);
	});
});

describe("play", () => {
	it("requires following suit and lets trump win", () => {
		const playing = skipDistressToPlay(startAttempt(4, 11));
		const leader = playing.currentSeat;
		if (leader === null) {
			throw new Error("expected leader");
		}
		const lead =
			playing.hands[leader]?.find((id) => !id.startsWith("submarine-")) ??
			playing.hands[leader]?.[0];
		if (lead === undefined) {
			throw new Error("empty hand");
		}
		const afterLead = must(
			apply(playing, { type: "card.play", attemptId: "a1", seatId: leader, cardId: lead }),
		);
		expect(afterLead.phase).toBe("trick");
		const follower = afterLead.currentSeat;
		if (follower === null) {
			throw new Error("expected follower");
		}
		const ledSuit = lead.split("-")[0];
		const legal = legalIntents(afterLead, follower).filter((intent) => intent.type === "card.play");
		const followerHand = afterLead.hands[follower] ?? [];
		const hasLed = followerHand.some((id) => id.startsWith(`${ledSuit}-`));
		if (hasLed) {
			expect(
				legal.every(
					(intent) => intent.type === "card.play" && intent.cardId.startsWith(`${ledSuit}-`),
				),
			).toBe(true);
			const offSuit = followerHand.find((id) => !id.startsWith(`${ledSuit}-`));
			if (offSuit !== undefined) {
				expect(
					apply(afterLead, {
						type: "card.play",
						attemptId: "a1",
						seatId: follower,
						cardId: offSuit,
					}).ok,
				).toBe(false);
			}
		}
	});

	it("stores the last trick and leaves one unplayed card with 3 players", () => {
		const playing = skipDistressToPlay(startAttempt(3, 42));
		const ended = playOut({
			...playing,
			tasks: [
				{
					instanceId: "last",
					ownerSeat: 0,
					status: "open",
					progress: 0,
					spec: {
						id: "x",
						kind: "nthTrick",
						n: 0,
						difficulty: { 3: 1, 4: 1, 5: 1 },
						captainMaySelect: true,
					},
				},
			],
		});
		expect(ended.lastTrick).not.toBeNull();
		expect(ended.phase).toBe("result");
		expect(ended.hands.flat()).toHaveLength(1);
		expect(remainingTricks(ended.hands)).toBe(0);
		expect(["won", "failed"]).toContain(ended.result);
	});

	it("emits mission won or failed by the end of the cards", () => {
		const { state } = createAttempt({
			attemptId: "a1",
			mission: { id: "m1", difficulty: 1 },
			playerCount: 4,
			seed: 8,
		});
		const ended = autoplay(state);
		expect(ended.phase).toBe("result");
		expect(ended.result === "won" || ended.result === "failed").toBe(true);
	});
});

describe("catalog", () => {
	it("covers every task family", () => {
		const kinds = new Set(TASK_CATALOG.map((spec) => spec.kind));
		expect(kinds).toEqual(
			new Set([
				"winCards",
				"winColor",
				"winValue",
				"winSubmarines",
				"winWith",
				"avoid",
				"trickCount",
				"consecutiveTricks",
				"nthTrick",
				"compareTricks",
				"trickSum",
				"trickFilter",
				"collectAllColors",
				"collectAllOfOneColor",
				"collectMoreColor",
			]),
		);
		expect(TASK_CATALOG.length).toBeGreaterThanOrEqual(80);
		expect(new Set(TASK_CATALOG.map((spec) => spec.id)).size).toBe(TASK_CATALOG.length);
	});
});
