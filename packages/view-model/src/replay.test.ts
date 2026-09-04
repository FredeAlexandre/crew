import { apply, createAttempt, legalIntents } from "@crew/engine";
import type { Fact, SeatId } from "@crew/protocol";
import { describe, expect, it } from "vitest";
import { buildReplay, frameIndexAt, type ReplayParticipant } from "./replay.ts";
import { must } from "./test-support.ts";

function participants(playerCount: number): ReplayParticipant[] {
	return Array.from({ length: playerCount }, (_, seatId) => ({
		seatId,
		playerId: `p${seatId}`,
		displayName: `P${seatId}`,
		isBot: false,
	}));
}

function collectAttempt(playerCount: 3 | 4 | 5 = 4, seed = 1) {
	const created = createAttempt({
		attemptId: "a1",
		mission: { id: "m1", difficulty: 1 },
		playerCount,
		seed,
	});
	return { state: created.state, facts: [...created.facts] };
}

function playUntil(
	state: ReturnType<typeof collectAttempt>["state"],
	facts: Fact[],
	stop: (current: typeof state) => boolean,
	limit = 80,
) {
	let current = state;
	for (let step = 0; step < limit && !stop(current); step += 1) {
		if (current.phase === "distressOffer") {
			const result = apply(current, {
				type: "distress.skip",
				attemptId: current.attemptId,
				seatId: 0,
			});
			current = must(result);
			if (result.ok) {
				facts.push(...result.facts);
			}
			continue;
		}
		const seat = current.currentSeat;
		if (seat === null) {
			break;
		}
		const intents = legalIntents(current, seat);
		const next =
			intents.find((intent) => intent.type === "task.predict") ??
			intents.find((intent) => intent.type === "task.take") ??
			intents.find((intent) => intent.type === "card.play") ??
			intents[0];
		if (next === undefined) {
			break;
		}
		const result = apply(current, next);
		current = must(result);
		if (result.ok) {
			facts.push(...result.facts);
		}
	}
	return current;
}

describe("buildReplay", () => {
	it("collapses the deal into one frame, then shows the draft from the viewer's seat", () => {
		const { state, facts } = collectAttempt(4, 1);
		const timeline = buildReplay({
			facts,
			participants: participants(4),
			setup: {
				difficulty: 1,
				captainSeat: state.captainSeat,
				distressDisabled: false,
				completedTricksVisible: true,
				missionId: "m1",
			},
			viewerSeat: 0,
			playerCount: 4,
			attemptId: "a1",
		});
		expect(timeline.frames.some((frame) => frame.factType === "card.dealt")).toBe(true);
		expect(timeline.frames.filter((frame) => frame.factType === "card.dealt")).toHaveLength(1);
		const last = timeline.frames.at(-1)?.view;
		expect(last?.scene).toBe("taskDraft");
		expect(last?.viewerSeat).toBe(0);
		expect(last?.seats[0]?.region).toBe("seat.self");
		expect(last?.hand.length).toBe(state.hands[0]?.length);
		expect(last?.centerTasks.length).toBeGreaterThan(0);
		expect(last?.affordances.canTakeTask).toBe(false);
	});

	it("marks a round checkpoint after a trick and unique colors for completed tasks", () => {
		const started = collectAttempt(4, 11);
		const facts = started.facts;
		const playing = playUntil(started.state, facts, (current) => current.phase === "play");
		const afterTrick = playUntil(
			playing,
			facts,
			(current) => current.trickHistory.length >= 1 || current.phase === "result",
		);
		const timeline = buildReplay({
			facts,
			participants: participants(4),
			setup: {
				difficulty: 1,
				captainSeat: playing.captainSeat,
				distressDisabled: false,
				completedTricksVisible: true,
				missionId: "m1",
			},
			viewerSeat: (playing.captainSeat ?? 0) as SeatId,
			playerCount: 4,
			attemptId: "a1",
		});
		expect(afterTrick.trickHistory.length).toBeGreaterThanOrEqual(1);
		const rounds = timeline.checkpoints.filter((mark) => mark.kind === "round");
		expect(rounds.length).toBeGreaterThanOrEqual(1);
		const tasks = timeline.checkpoints.filter((mark) => mark.kind === "task");
		const colors = new Set(tasks.map((mark) => mark.colorIndex));
		expect(colors.size).toBe(tasks.length);
		const resolved = timeline.frames.find((frame) => frame.factType === "trick.resolved")?.view;
		expect(resolved?.trick.cards).toHaveLength(4);
		expect(resolved?.scene).toBe("play");
	});

	it("keeps other hands as counts only", () => {
		const { state, facts } = collectAttempt(4, 2);
		const timeline = buildReplay({
			facts,
			participants: participants(4),
			setup: {
				difficulty: 1,
				captainSeat: state.captainSeat,
				distressDisabled: false,
				completedTricksVisible: true,
			},
			viewerSeat: 1,
			playerCount: 4,
			attemptId: "a1",
		});
		const view = timeline.frames.at(-1)?.view;
		expect(view?.hand.map((card) => card.cardId)).toEqual(state.hands[1]);
		const dumped = JSON.stringify(view?.seats ?? []);
		for (const [seatId, hand] of state.hands.entries()) {
			if (seatId === 1) {
				continue;
			}
			for (const cardId of hand) {
				expect(dumped.includes(cardId)).toBe(false);
			}
		}
	});
});

describe("frameIndexAt", () => {
	it("returns the last frame whose start is at or before the playhead", () => {
		const frames = [{ startMs: 0 }, { startMs: 400 }, { startMs: 900 }];
		expect(frameIndexAt(frames, 0)).toBe(0);
		expect(frameIndexAt(frames, 399)).toBe(0);
		expect(frameIndexAt(frames, 400)).toBe(1);
		expect(frameIndexAt(frames, 2000)).toBe(2);
	});
});
