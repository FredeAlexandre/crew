import { describe, expect, it } from "vitest";
import { pickSeatIntent } from "./bot.ts";
import { skipDistressToPlay, startAttempt, takeAllTasks } from "./harness.ts";

describe("pickSeatIntent", () => {
	it("takes a task during draft", () => {
		const state = startAttempt(3, 1);
		const seat = state.currentSeat;
		if (seat === null) {
			throw new Error("expected draft seat");
		}
		const intent = pickSeatIntent(state, seat);
		expect(intent?.type).toBe("task.take");
	});

	it("plays a card and ignores sonar between tricks", () => {
		const playing = skipDistressToPlay(startAttempt(4, 6));
		const seat = playing.currentSeat;
		if (seat === null) {
			throw new Error("expected leader");
		}
		const intent = pickSeatIntent(playing, seat);
		expect(intent?.type).toBe("card.play");
	});

	it("picks skip if asked during the distress offer, and never sonar", () => {
		const offer = takeAllTasks(startAttempt(3, 1));
		expect(offer.phase).toBe("distressOffer");
		expect(offer.currentSeat).toBeNull();
		expect(pickSeatIntent(offer, 0)?.type).toBe("distress.skip");
	});
});
