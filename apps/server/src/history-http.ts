import { createDb } from "@crew/db";
import type { Hono } from "hono";
import { readPlayerHistory } from "./history.ts";
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
}
