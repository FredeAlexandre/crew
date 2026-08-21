import { describe, expect, it } from "vitest";
import { CARD_IDS } from "./cards.ts";
import { echoFact, echoIntentSchema, factSchema, intentSchema } from "./index.ts";

describe("echoFact", () => {
	it("assigns the next seq and keeps the payload", () => {
		const intent = echoIntentSchema.parse({
			type: "echo",
			attemptId: "attempt-1",
			seq: 0,
			payload: { ping: true },
		});
		expect(echoFact(intent, 1)).toEqual({
			type: "echo",
			attemptId: "attempt-1",
			seq: 1,
			payload: { ping: true },
		});
	});
});

describe("wire schemas", () => {
	it("parses a card.play intent", () => {
		const parsed = intentSchema.parse({
			type: "card.play",
			attemptId: "attempt-1",
			seatId: 0,
			cardId: "pink-7",
		});
		expect(parsed.type).toBe("card.play");
	});

	it("allows card.dealt and card.passed without cardId after projection", () => {
		const dealt = factSchema.parse({
			type: "card.dealt",
			attemptId: "attempt-1",
			seq: 1,
			seatId: 2,
			index: 0,
			handCount: 1,
		});
		const passed = factSchema.parse({
			type: "card.passed",
			attemptId: "attempt-1",
			seq: 2,
			fromSeat: 0,
			toSeat: 1,
		});
		expect(dealt.type).toBe("card.dealt");
		expect(passed.type).toBe("card.passed");
		if (dealt.type === "card.dealt") {
			expect(dealt.cardId).toBeUndefined();
		}
		if (passed.type === "card.passed") {
			expect(passed.cardId).toBeUndefined();
		}
	});

	it("parses a card.played fact", () => {
		const parsed = factSchema.parse({
			type: "card.played",
			attemptId: "attempt-1",
			seq: 3,
			seatId: 1,
			cardId: "submarine-4",
			trickOrder: 2,
		});
		expect(parsed.type).toBe("card.played");
	});

	it("names all 40 playing cards", () => {
		expect(CARD_IDS).toHaveLength(40);
	});
});
