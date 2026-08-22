import { env } from "@crew/env/web";
import {
	normalizeRoomCode,
	type PlayerCount,
	type RoomErrorCode,
	type RoomTicket,
	roomErrorMessageSchema,
	roomTicketSchema,
} from "@crew/protocol";
import { authClient } from "./auth-client.ts";
import { normalizeDisplayName } from "./display-name.ts";

class RoomHttpError extends Error {
	readonly code: RoomErrorCode | "unexpected";

	constructor(code: RoomErrorCode | "unexpected", message: string) {
		super(message);
		this.name = "RoomHttpError";
		this.code = code;
	}
}

function serverOrigin() {
	return env.VITE_SERVER_URL.replace(/\/$/, "");
}

export async function ensureGuestSession(): Promise<{ displayName: string }> {
	let session = await authClient.getSession();
	if (!session.data?.user) {
		const result = await authClient.signIn.anonymous();
		if (result.error && result.error.code !== "ANONYMOUS_USERS_CANNOT_SIGN_IN_AGAIN_ANONYMOUSLY") {
			throw new RoomHttpError("unauthenticated", result.error.message ?? "sign in first");
		}
		session = await authClient.getSession();
	}
	return { displayName: session.data?.user.name ?? "" };
}

export async function persistDisplayName(raw: string): Promise<string | null> {
	const name = normalizeDisplayName(raw);
	if (name.length === 0) {
		return null;
	}
	const session = await ensureGuestSession();
	if (session.displayName === name) {
		return name;
	}
	const result = await authClient.updateUser({ name });
	if (result.error) {
		throw new RoomHttpError("unexpected", result.error.message ?? "could not save name");
	}
	return name;
}

async function readTicket(response: Response): Promise<RoomTicket> {
	const body: unknown = await response.json().catch(() => null);
	if (response.ok) {
		const parsed = roomTicketSchema.safeParse(body);
		if (!parsed.success) {
			throw new RoomHttpError("unexpected", "unexpected response");
		}
		return parsed.data;
	}
	const error = roomErrorMessageSchema.safeParse(body);
	if (error.success) {
		throw new RoomHttpError(error.data.code, error.data.message);
	}
	throw new RoomHttpError("unexpected", "unexpected response");
}

export async function createRoom(playerCount: PlayerCount): Promise<RoomTicket> {
	await ensureGuestSession();
	const response = await fetch(new URL("/rooms", `${serverOrigin()}/`).toString(), {
		method: "POST",
		credentials: "include",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ playerCount }),
	});
	return readTicket(response);
}

export async function joinRoom(code: string): Promise<RoomTicket> {
	await ensureGuestSession();
	const response = await fetch(
		new URL(`/rooms/${normalizeRoomCode(code)}/join`, `${serverOrigin()}/`).toString(),
		{
			method: "POST",
			credentials: "include",
		},
	);
	return readTicket(response);
}

export function roomErrorCopy(error: unknown): string {
	if (!(error instanceof RoomHttpError)) {
		return "Could not reach the table. Try again.";
	}
	switch (error.code) {
		case "unauthenticated":
			return "Could not start a guest session. Try again.";
		case "unknownRoom":
			return "No lobby with that code.";
		case "roomFull":
			return "That table is full.";
		case "alreadyStarted":
			return "That game has already started.";
		case "illegalIntent":
			return "Could not open a table.";
		default:
			return error.message;
	}
}
