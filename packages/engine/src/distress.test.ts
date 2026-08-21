import type { CardId } from "@crew/protocol";
import { describe, expect, it } from "vitest";
import { parseCard } from "./deck.ts";
import { must, startAttempt, takeAllTasks } from "./harness.ts";
import { apply } from "./index.ts";

describe("distress", () => {
	it("rejects passing a submarine and passes every color card the same way", () => {
		const offered = takeAllTasks(startAttempt(4, 9));
		const activated = must(
			apply(offered, {
				type: "distress.activate",
				attemptId: "a1",
				seatId: 0,
				direction: "right",
			}),
		);
		expect(activated.phase).toBe("distressPass");
		expect(activated.distressDirection).toBe("right");

		const sub = activated.hands[0]?.find((id) => parseCard(id).suit === "submarine");
		if (sub !== undefined) {
			expect(
				apply(activated, {
					type: "distress.passCard",
					attemptId: "a1",
					seatId: 0,
					cardId: sub,
				}).ok,
			).toBe(false);
		}

		let current = activated;
		const passed: CardId[] = [];
		for (let seat = 0; seat < 4; seat += 1) {
			const color = current.hands[seat]?.find((id) => parseCard(id).suit !== "submarine");
			if (color === undefined) {
				throw new Error("no color card");
			}
			passed.push(color);
			current = must(
				apply(current, {
					type: "distress.passCard",
					attemptId: "a1",
					seatId: seat,
					cardId: color,
				}),
			);
		}
		expect(current.phase).toBe("play");
		expect(current.hands[1]).toContain(passed[0]);
		expect(current.hands[2]).toContain(passed[1]);
		expect(current.hands[3]).toContain(passed[2]);
		expect(current.hands[0]).toContain(passed[3]);
	});
});
