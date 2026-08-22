import { createAuth } from "@crew/auth";
import { createDb, players } from "@crew/db";
import { eq } from "drizzle-orm";
import type { Context } from "hono";
import { DISPLAY_NAME_HEADER, PLAYER_ID_HEADER } from "./player-headers.ts";

type SessionPlayer = {
	playerId: string;
	displayName: string;
};

export function errorPayload(code: string, message: string) {
	return { type: "error" as const, code, message };
}

export async function requirePlayer(
	c: Context<{ Bindings: Env }>,
): Promise<SessionPlayer | Response> {
	const auth = createAuth();
	const session = await auth.api.getSession({ headers: c.req.raw.headers });
	if (session === null) {
		return c.json(errorPayload("unauthenticated", "sign in first"), 401);
	}

	const userId = session.user.id;
	const displayName = session.user.name;
	const db = createDb(c.env.DB);
	const existing = await db.select().from(players).where(eq(players.userId, userId)).limit(1);
	const row = existing[0];
	if (row === undefined) {
		await db.insert(players).values({
			id: userId,
			userId,
			displayName,
		});
	} else if (row.displayName !== displayName) {
		await db.update(players).set({ displayName }).where(eq(players.id, row.id));
	}

	return { playerId: userId, displayName };
}

export function withPlayerHeaders(request: Request, player: SessionPlayer): Request {
	const headers = new Headers(request.headers);
	headers.set(PLAYER_ID_HEADER, player.playerId);
	headers.set(DISPLAY_NAME_HEADER, encodeURIComponent(player.displayName));
	return new Request(request, { headers });
}
