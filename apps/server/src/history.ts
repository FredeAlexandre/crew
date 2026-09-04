import { type createDb, gameHistory, gameHistoryEvents, playerHistory, user } from "@crew/db";
import { and, desc, eq, inArray } from "drizzle-orm";
import type { TableState } from "./table.ts";

/** D1 rejects a query with more than 100 bound parameters. */
const D1_MAX_BOUND_PARAMETERS = 100;
/** Columns written per `game_history_events` row. */
const GAME_HISTORY_EVENT_COLUMNS = 5;

export const GAME_HISTORY_EVENT_CHUNK = Math.floor(
	D1_MAX_BOUND_PARAMETERS / GAME_HISTORY_EVENT_COLUMNS,
);

/** Record a completed attempt for signed-in people seated at this table. */
export async function recordPlayerHistory(db: ReturnType<typeof createDb>, state: TableState) {
	const engine = state.engine;
	if (engine === null || engine.phase !== "result") {
		return;
	}
	const result = engine.result;
	if (result === null) {
		return;
	}
	const facts = (state.historyFacts ?? []).filter((fact) => fact.attemptId === engine.attemptId);
	if (facts.length === 0) {
		return;
	}
	const playerIds = state.seats.flatMap((seat) =>
		seat === null || seat.playerId.startsWith("bot:") ? [] : [seat.playerId],
	);
	if (playerIds.length === 0) {
		return;
	}
	const signedIn = await db
		.select({ id: user.id })
		.from(user)
		.where(and(inArray(user.id, playerIds), eq(user.isAnonymous, false)));
	if (signedIn.length === 0) {
		return;
	}
	const participants = state.seats.flatMap((seat, seatId) =>
		seat === null
			? []
			: [
					{
						seatId,
						playerId: seat.playerId,
						displayName: seat.displayName,
						isBot: seat.playerId.startsWith("bot:"),
					},
				],
	);
	await db
		.insert(gameHistory)
		.values({
			attemptId: engine.attemptId,
			roomCode: state.code,
			missionId: engine.mission?.id ?? "unknown",
			result,
			failReason: engine.failReason,
			difficulty: engine.mission?.difficulty ?? 0,
			playerCount: state.playerCount,
			participants: JSON.stringify(participants),
			setup: JSON.stringify(state.setup),
			finalState: JSON.stringify(engine),
			...(state.historyStartedAt === undefined
				? {}
				: { startedAt: new Date(state.historyStartedAt) }),
		})
		.onConflictDoNothing();
	const eventRows = facts.map((fact) => ({
		id: crypto.randomUUID(),
		attemptId: engine.attemptId,
		seq: fact.seq,
		type: fact.type,
		payload: JSON.stringify(fact),
	}));
	for (const batch of chunk(eventRows, GAME_HISTORY_EVENT_CHUNK)) {
		await db.insert(gameHistoryEvents).values(batch).onConflictDoNothing();
	}
	await db
		.insert(playerHistory)
		.values(
			signedIn.map((player) => ({
				id: crypto.randomUUID(),
				userId: player.id,
				missionId: engine.mission?.id ?? "unknown",
				attemptId: engine.attemptId,
				result,
				roomCode: state.code,
				playerCount: state.playerCount,
			})),
		)
		.onConflictDoNothing();
}

export async function readPlayerHistory(db: ReturnType<typeof createDb>, userId: string) {
	return db
		.select({
			missionId: playerHistory.missionId,
			attemptId: playerHistory.attemptId,
			result: playerHistory.result,
			roomCode: playerHistory.roomCode,
			playerCount: playerHistory.playerCount,
			completedAt: playerHistory.completedAt,
		})
		.from(playerHistory)
		.where(eq(playerHistory.userId, userId))
		.orderBy(desc(playerHistory.completedAt));
}

export async function readPlayerGame(
	db: ReturnType<typeof createDb>,
	userId: string,
	attemptId: string,
) {
	const owned = await db
		.select({ game: gameHistory })
		.from(gameHistory)
		.innerJoin(playerHistory, eq(playerHistory.attemptId, gameHistory.attemptId))
		.where(and(eq(playerHistory.userId, userId), eq(gameHistory.attemptId, attemptId)))
		.limit(1);
	const game = owned[0]?.game;
	if (game === undefined) {
		return null;
	}
	const events = await db
		.select({
			seq: gameHistoryEvents.seq,
			type: gameHistoryEvents.type,
			payload: gameHistoryEvents.payload,
		})
		.from(gameHistoryEvents)
		.where(eq(gameHistoryEvents.attemptId, attemptId))
		.orderBy(gameHistoryEvents.seq);
	return {
		...game,
		participants: JSON.parse(game.participants) as unknown,
		setup: JSON.parse(game.setup) as unknown,
		finalState: JSON.parse(game.finalState) as unknown,
		events: events.map((event) => ({
			...event,
			payload: JSON.parse(event.payload) as unknown,
		})),
	};
}

function chunk<T>(items: T[], size: number): T[][] {
	const batches: T[][] = [];
	for (let index = 0; index < items.length; index += size) {
		batches.push(items.slice(index, index + size));
	}
	return batches;
}
