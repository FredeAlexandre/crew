import { type createDb, playerHistory, user } from "@crew/db";
import { and, desc, eq, inArray } from "drizzle-orm";
import type { TableState } from "./table.ts";

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
