import { describe, expect, it } from "vitest";
import { CARD_IDS } from "./cards.ts";
import {
	createRoomRequestSchema,
	echoFact,
	echoIntentSchema,
	factSchema,
	intentSchema,
	isRoomCode,
	normalizeRoomCode,
	playerCountSchema,
	ROOM_CODE_MAX_LENGTH,
	ROOM_CODE_MIN_LENGTH,
	roomTicketSchema,
	serverMessageSchema,
	snapshotEnvelopeSchema,
	splitCardId,
} from "./index.ts";

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
		expect(splitCardId("pink-7")).toEqual({ suit: "pink", value: 7 });
		expect(splitCardId("submarine-4")).toEqual({ suit: "submarine", value: 4 });
	});

	it("parses lobby intents", () => {
		expect(intentSchema.parse({ type: "player.ready", ready: true }).type).toBe("player.ready");
		expect(intentSchema.parse({ type: "player.rename", displayName: "  Alex  " })).toEqual({
			type: "player.rename",
			displayName: "Alex",
		});
		expect(() => intentSchema.parse({ type: "player.rename", displayName: "   " })).toThrow();
		expect(intentSchema.parse({ type: "host.start" }).type).toBe("host.start");
		expect(intentSchema.parse({ type: "host.retry" }).type).toBe("host.retry");
		expect(intentSchema.parse({ type: "host.continue" }).type).toBe("host.continue");
		expect(intentSchema.parse({ type: "host.fillBots" }).type).toBe("host.fillBots");
		expect(intentSchema.parse({ type: "host.fillBots", seatId: 2 })).toEqual({
			type: "host.fillBots",
			seatId: 2,
		});
		expect(intentSchema.parse({ type: "host.kick", seatId: 1 }).type).toBe("host.kick");
		expect(
			intentSchema.parse({
				type: "host.configure",
				difficulty: 4,
				captainSeat: null,
				distressDisabled: true,
				completedTricksVisible: false,
			}).type,
		).toBe("host.configure");
		expect(intentSchema.parse({ type: "host.configure", difficulty: 8, captainSeat: 2 }).type).toBe(
			"host.configure",
		);
		expect(
			intentSchema.parse({
				type: "host.configure",
				difficulty: 4,
				captainSeat: null,
				playerCount: 5,
			}),
		).toMatchObject({ type: "host.configure", playerCount: 5 });
		expect(() =>
			intentSchema.parse({ type: "host.configure", difficulty: 0, captainSeat: null }),
		).toThrow();
	});

	it("parses table-life facts and a lobby snapshot", () => {
		const sat = factSchema.parse({
			type: "player.sat",
			attemptId: null,
			seq: 1,
			seatId: 0,
			playerId: "p1",
			displayName: "Alex",
		});
		expect(sat.type).toBe("player.sat");
		const snapshot = snapshotEnvelopeSchema.parse({
			type: "room.snapshot",
			attemptId: null,
			seq: 1,
			viewModel: { scene: "lobby" },
		});
		expect(snapshot.attemptId).toBeNull();
		expect(serverMessageSchema.parse(snapshot).type).toBe("room.snapshot");
		expect(
			serverMessageSchema.parse({
				type: "error",
				code: "roomFull",
				message: "table is full",
			}).type,
		).toBe("error");
	});

	it("normalizes and accepts HTTP room tickets", () => {
		expect(normalizeRoomCode(" ab-12 ")).toBe("AB12");
		expect(normalizeRoomCode("a".repeat(10)).length).toBe(ROOM_CODE_MAX_LENGTH);
		expect(isRoomCode("AB12")).toBe(true);
		expect(isRoomCode("ab12")).toBe(false);
		expect(isRoomCode("A".repeat(ROOM_CODE_MIN_LENGTH - 1))).toBe(false);
		expect(playerCountSchema.parse(3)).toBe(3);
		expect(createRoomRequestSchema.parse({ playerCount: 4 }).playerCount).toBe(4);
		expect(createRoomRequestSchema.parse({ playerCount: 4 }).mode).toBe("freePlay");
		expect(createRoomRequestSchema.parse({ playerCount: 4, mode: "campaign" }).mode).toBe(
			"campaign",
		);
		expect(
			roomTicketSchema.parse({
				code: "AB12",
				playerCount: 4,
				wsPath: "/room/AB12",
			}).code,
		).toBe("AB12");
	});
});
