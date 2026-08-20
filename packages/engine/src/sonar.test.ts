import { describe, expect, it } from "vitest";
import { parseCard } from "./deck.ts";
import { skipDistressToPlay, startAttempt } from "./harness.ts";
import { apply, legalIntents } from "./index.ts";
import { sonarPositionFor } from "./sonar.ts";

describe("sonar", () => {
	it("accepts only highest, lowest, or only of a color, never a submarine", () => {
		expect(sonarPositionFor(["yellow-2", "yellow-6", "yellow-8"], "yellow-8")).toBe("highest");
		expect(sonarPositionFor(["yellow-2", "yellow-6", "yellow-8"], "yellow-2")).toBe("lowest");
		expect(sonarPositionFor(["yellow-2", "yellow-6", "yellow-8"], "yellow-6")).toBeNull();
		expect(sonarPositionFor(["yellow-8"], "yellow-8")).toBe("only");
		expect(sonarPositionFor(["submarine-4"], "submarine-4")).toBeNull();
	});

	it("is legal between tricks after draft, and frozen to the chosen position", () => {
		const playing = skipDistressToPlay(startAttempt(4, 6));
		const seat = playing.currentSeat ?? 0;
		const uses = legalIntents(playing, seat).filter((intent) => intent.type === "sonar.use");
		expect(uses.length).toBeGreaterThan(0);
		const use = uses[0];
		if (use === undefined || use.type !== "sonar.use") {
			throw new Error("expected sonar");
		}
		const after = apply(playing, use);
		if (!after.ok) {
			throw new Error(after.error);
		}
		expect(after.facts.some((fact) => fact.type === "sonar.used")).toBe(true);
		expect(after.state.sonar[seat]?.available).toBe(false);
		expect(after.state.sonar[seat]?.communication).toEqual({
			cardId: use.cardId,
			position: use.position,
		});
		expect(apply(after.state, use).ok).toBe(false);
	});

	it("cannot be used during a trick or before draft ends", () => {
		const drafting = startAttempt(4, 6);
		const seat = drafting.currentSeat ?? 0;
		const hand = drafting.hands[seat] ?? [];
		const color = hand.find((id) => parseCard(id).suit !== "submarine");
		if (color !== undefined) {
			expect(
				apply(drafting, {
					type: "sonar.use",
					attemptId: "a1",
					seatId: seat,
					cardId: color,
					position: "only",
				}).ok,
			).toBe(false);
		}

		const playing = skipDistressToPlay(drafting);
		const leader = playing.currentSeat;
		if (leader === null) {
			throw new Error("leader");
		}
		const lead = playing.hands[leader]?.[0];
		if (lead === undefined) {
			throw new Error("card");
		}
		const inTrick = apply(playing, {
			type: "card.play",
			attemptId: "a1",
			seatId: leader,
			cardId: lead,
		});
		if (!inTrick.ok) {
			throw new Error(inTrick.error);
		}
		expect(inTrick.state.phase).toBe("trick");
		const follower = inTrick.state.currentSeat ?? 0;
		const sonar = legalIntents(inTrick.state, follower).find(
			(intent) => intent.type === "sonar.use",
		);
		expect(sonar).toBeUndefined();
	});
});
