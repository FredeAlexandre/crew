import { createDb } from "@crew/db";
import type { Hono } from "hono";
import { readPlayerGame, readPlayerHistory } from "./history.ts";
import { requireAuthenticatedPlayer } from "./session.ts";

export function registerHistoryRoutes(app: Hono<{ Bindings: Env }>) {
	app.get("/history", async (c) => {
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
	});

	app.get("/history/:attemptId", async (c) => {
		const player = await requireAuthenticatedPlayer(c);
		if (player instanceof Response) {
			return player;
		}
		const game = await readPlayerGame(
			createDb(c.env.DB),
			player.playerId,
			c.req.param("attemptId"),
		);
		if (game === null) {
			return c.json({ type: "error", code: "unknownHistory", message: "history not found" }, 404);
		}
		return c.json(game);
	});
}
