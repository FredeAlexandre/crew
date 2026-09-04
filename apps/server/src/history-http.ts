import { createDb } from "@crew/db";
import type { Context, Hono } from "hono";
import { readPlayerGame, readPlayerHistory } from "./history.ts";
import { requireAuthenticatedPlayer } from "./session.ts";

type AppContext = Context<{ Bindings: Env }>;

async function listHistory(c: AppContext) {
	const player = await requireAuthenticatedPlayer(c);
	if (player instanceof Response) {
		return player;
	}
	const entries = await readPlayerHistory(createDb(c.env.DB), player.playerId);
	return c.json({
		history: entries.map((entry) => ({
			...entry,
			completedAt: entry.completedAt.toISOString(),
		})),
	});
}

async function readHistoryGame(c: AppContext) {
	const player = await requireAuthenticatedPlayer(c);
	if (player instanceof Response) {
		return player;
	}
	const attemptId = c.req.param("attemptId");
	if (attemptId === undefined) {
		return c.json({ type: "error", code: "unknownHistory", message: "history not found" }, 404);
	}
	const game = await readPlayerGame(createDb(c.env.DB), player.playerId, attemptId);
	if (game === null) {
		return c.json({ type: "error", code: "unknownHistory", message: "history not found" }, 404);
	}
	return c.json(game);
}

export function registerHistoryRoutes(app: Hono<{ Bindings: Env }>) {
	app.get("/history", listHistory);
	app.get("/history/:attemptId", readHistoryGame);
	app.get("/api/history", listHistory);
	app.get("/api/history/:attemptId", readHistoryGame);
}
