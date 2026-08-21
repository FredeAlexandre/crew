import { createDb, rooms } from "@crew/db";
import type { PlayerCount } from "@crew/engine";
import { eq } from "drizzle-orm";
import type { Hono } from "hono";
import { errorPayload, requirePlayer, withPlayerHeaders } from "./session.ts";

const CODE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

export function registerRoomRoutes(app: Hono<{ Bindings: Env }>) {
	app.post("/rooms", async (c) => {
		const player = await requirePlayer(c);
		if (player instanceof Response) {
			return player;
		}
		const playerCount = parsePlayerCount(await c.req.json().catch(() => null));
		if (playerCount === null) {
			return c.json(errorPayload("illegalIntent", "playerCount must be 3, 4, or 5"), 400);
		}
		const db = createDb(c.env.DB);
		const code = await insertRoom(db, player.playerId, playerCount);
		await c.env.ROOM.getByName(code).init({
			code,
			hostPlayerId: player.playerId,
			playerCount,
		});
		return c.json({ code, playerCount, wsPath: `/room/${code}` });
	});

	app.post("/rooms/:code/join", async (c) => {
		const player = await requirePlayer(c);
		if (player instanceof Response) {
			return player;
		}
		const code = c.req.param("code").toUpperCase();
		const db = createDb(c.env.DB);
		const existing = await db.select().from(rooms).where(eq(rooms.code, code)).limit(1);
		if (existing[0] === undefined) {
			return c.json(errorPayload("unknownRoom", "room not found"), 404);
		}
		const live = await c.env.ROOM.getByName(code).summary();
		if (live === null) {
			return c.json(errorPayload("unknownRoom", "room not found"), 404);
		}
		const seated = live.playerIds.includes(player.playerId);
		if (!seated && live.status !== "lobby") {
			return c.json(errorPayload("alreadyStarted", "game already started"), 409);
		}
		if (!seated && live.occupancy >= live.playerCount) {
			return c.json(errorPayload("roomFull", "no empty seat"), 409);
		}
		return c.json({ code, playerCount: live.playerCount, wsPath: `/room/${code}` });
	});

	app.get("/room/:code", async (c) => {
		if (c.req.header("upgrade")?.toLowerCase() !== "websocket") {
			return c.text("Expected Upgrade: websocket", 426);
		}
		const player = await requirePlayer(c);
		if (player instanceof Response) {
			return player;
		}
		const code = c.req.param("code").toUpperCase();
		const db = createDb(c.env.DB);
		const existing = await db.select().from(rooms).where(eq(rooms.code, code)).limit(1);
		if (existing[0] === undefined) {
			return c.json(errorPayload("unknownRoom", "room not found"), 404);
		}
		return c.env.ROOM.getByName(code).fetch(withPlayerHeaders(c.req.raw, player));
	});
}

function parsePlayerCount(body: unknown): PlayerCount | null {
	if (typeof body !== "object" || body === null || !("playerCount" in body)) {
		return null;
	}
	const value = body.playerCount;
	if (value === 3 || value === 4 || value === 5) {
		return value;
	}
	return null;
}

function randomCode(length: number): string {
	const bytes = new Uint8Array(length);
	crypto.getRandomValues(bytes);
	let out = "";
	for (const byte of bytes) {
		out += CODE_ALPHABET[byte % CODE_ALPHABET.length] ?? "A";
	}
	return out;
}

async function insertRoom(
	db: ReturnType<typeof createDb>,
	hostPlayerId: string,
	playerCount: PlayerCount,
): Promise<string> {
	for (let length = 4; length <= 6; length += 1) {
		for (let attempt = 0; attempt < 8; attempt += 1) {
			const code = randomCode(length);
			try {
				await db.insert(rooms).values({
					id: crypto.randomUUID(),
					code,
					hostPlayerId,
					status: "lobby",
					occupancy: 0,
					playerCount,
				});
				return code;
			} catch {}
		}
	}
	throw new Error("could not mint a unique room code");
}
