import { createDb, rooms } from "@crew/db";
import type { PlayerCount } from "@crew/engine";
import {
	createRoomRequestSchema,
	normalizeRoomCode,
	ROOM_CODE_ALPHABET,
	roomCodeSchema,
} from "@crew/protocol";
import { eq } from "drizzle-orm";
import type { Hono } from "hono";
import { errorPayload, requirePlayer, withPlayerHeaders } from "./session.ts";

export function registerRoomRoutes(app: Hono<{ Bindings: Env }>) {
	app.post("/rooms", async (c) => {
		const player = await requirePlayer(c);
		if (player instanceof Response) {
			return player;
		}
		const parsed = createRoomRequestSchema.safeParse(await c.req.json().catch(() => null));
		if (!parsed.success) {
			return c.json(errorPayload("illegalIntent", "playerCount must be 3, 4, or 5"), 400);
		}
		const { playerCount } = parsed.data;
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
		const code = readRoomCode(c.req.param("code"));
		if (code === null) {
			return c.json(errorPayload("unknownRoom", "room not found"), 404);
		}
		const db = createDb(c.env.DB);
		const existing = await db.select().from(rooms).where(eq(rooms.code, code)).limit(1);
		if (existing[0] === undefined) {
			return c.json(errorPayload("unknownRoom", "room not found"), 404);
		}
		const live = await c.env.ROOM.getByName(code).summary();
		if (live === null) {
			return c.json(errorPayload("unknownRoom", "room not found"), 404);
		}
		const blockedUntil = await c.env.ROOM.getByName(code).reconnectBlockedUntil(player.playerId);
		if (blockedUntil !== null) {
			return c.json(
				errorPayload(
					"reconnectBlocked",
					`you were kicked; try again in ${Math.ceil((blockedUntil - Date.now()) / 1000)} seconds`,
				),
				409,
			);
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
		const code = readRoomCode(c.req.param("code"));
		if (code === null) {
			return c.json(errorPayload("unknownRoom", "room not found"), 404);
		}
		const db = createDb(c.env.DB);
		const existing = await db.select().from(rooms).where(eq(rooms.code, code)).limit(1);
		if (existing[0] === undefined) {
			return c.json(errorPayload("unknownRoom", "room not found"), 404);
		}
		return c.env.ROOM.getByName(code).fetch(withPlayerHeaders(c.req.raw, player));
	});
}

function readRoomCode(raw: string): string | null {
	const code = normalizeRoomCode(raw);
	if (!roomCodeSchema.safeParse(code).success) {
		return null;
	}
	return code;
}

function randomCode(length: number): string {
	const bytes = new Uint8Array(length);
	crypto.getRandomValues(bytes);
	let out = "";
	for (const byte of bytes) {
		out += ROOM_CODE_ALPHABET[byte % ROOM_CODE_ALPHABET.length] ?? "A";
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
