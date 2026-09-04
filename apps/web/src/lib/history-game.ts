import { type Fact, factSchema, playerCountSchema, seatIdSchema } from "@crew/protocol";
import type { ReplayParticipant, ReplaySetup } from "@crew/view-model/replay";

export type HistoryGame = {
	attemptId: string;
	missionId: string;
	result: "won" | "failed";
	playerCount: 3 | 4 | 5;
	participants: ReplayParticipant[];
	setup: ReplaySetup;
	facts: Fact[];
};

export function parseHistoryGame(body: unknown): HistoryGame | null {
	if (!isRecord(body)) {
		return null;
	}
	const attemptId = asString(body.attemptId);
	const missionId = asString(body.missionId);
	const result = body.result === "won" || body.result === "failed" ? body.result : null;
	const playerCount = playerCountSchema.safeParse(body.playerCount);
	const participants = parseParticipants(body.participants);
	const setup = parseSetup(body.setup);
	const events = Array.isArray(body.events) ? body.events : null;
	if (
		attemptId === null ||
		missionId === null ||
		result === null ||
		!playerCount.success ||
		participants === null ||
		setup === null ||
		events === null
	) {
		return null;
	}
	const facts = events.flatMap((event) => {
		if (!isRecord(event)) {
			return [];
		}
		const fact = factSchema.safeParse(event.payload);
		return fact.success ? [fact.data] : [];
	});
	return {
		attemptId,
		missionId,
		result,
		playerCount: playerCount.data,
		participants,
		setup: { ...setup, missionId },
		facts,
	};
}

function parseParticipants(value: unknown): ReplayParticipant[] | null {
	if (!Array.isArray(value)) {
		return null;
	}
	const participants: ReplayParticipant[] = [];
	for (const entry of value) {
		if (!isRecord(entry)) {
			return null;
		}
		const seatId = seatIdSchema.safeParse(entry.seatId);
		const playerId = asString(entry.playerId);
		const displayName = typeof entry.displayName === "string" ? entry.displayName : null;
		if (!seatId.success || playerId === null || displayName === null) {
			return null;
		}
		participants.push({
			seatId: seatId.data,
			playerId,
			displayName,
			isBot: entry.isBot === true,
		});
	}
	return participants;
}

function parseSetup(value: unknown): ReplaySetup | null {
	if (!isRecord(value)) {
		return null;
	}
	if (typeof value.difficulty !== "number" || !Number.isFinite(value.difficulty)) {
		return null;
	}
	let captainSeat: ReplaySetup["captainSeat"] = null;
	if (value.captainSeat !== null && value.captainSeat !== undefined) {
		const parsed = seatIdSchema.safeParse(value.captainSeat);
		if (!parsed.success) {
			return null;
		}
		captainSeat = parsed.data;
	}
	return {
		difficulty: value.difficulty,
		captainSeat,
		distressDisabled: value.distressDisabled === true,
		completedTricksVisible: value.completedTricksVisible !== false,
	};
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function asString(value: unknown): string | null {
	return typeof value === "string" && value.length > 0 ? value : null;
}
