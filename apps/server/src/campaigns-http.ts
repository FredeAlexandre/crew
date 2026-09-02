import { createDb } from "@crew/db";
import type { Hono } from "hono";
import { listPlayerCampaigns, readPlayerCampaign } from "./history.ts";
import { requireAuthenticatedPlayer } from "./session.ts";

export function registerCampaignRoutes(app: Hono<{ Bindings: Env }>) {
	app.get("/campaigns", async (c) => {
		const player = await requireAuthenticatedPlayer(c);
		if (player instanceof Response) {
			return player;
		}
		const db = createDb(c.env.DB);
		const campaigns = await listPlayerCampaigns(db, player.playerId);
		return c.json({ campaigns });
	});

	app.get("/campaigns/:id", async (c) => {
		const player = await requireAuthenticatedPlayer(c);
		if (player instanceof Response) {
			return player;
		}
		const db = createDb(c.env.DB);
		const campaign = await readPlayerCampaign(db, player.playerId, c.req.param("id"));
		if (campaign === null) {
			return c.json({ type: "error", code: "unknownCampaign", message: "campaign not found" }, 404);
		}
		return c.json(campaign);
	});
}
