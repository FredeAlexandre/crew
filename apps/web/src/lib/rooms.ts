import {
	normalizeRoomCode,
	type PlayerCount,
	type RoomErrorCode,
	type RoomTicket,
	roomErrorMessageSchema,
	roomTicketSchema,
} from "@crew/protocol";
import { apiOrigin } from "./api-origin.ts";
import { authClient } from "./auth-client.ts";
import { normalizeDisplayName } from "./display-name.ts";
import type { Translate } from "./i18n.tsx";

export type TableError = { code: RoomErrorCode; seconds?: number };

class RoomHttpError extends Error {
	readonly code: RoomErrorCode | "unexpected";

	constructor(code: RoomErrorCode | "unexpected", message: string) {
		super(message);
		this.name = "RoomHttpError";
		this.code = code;
	}
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
	if (!session.data?.user) {
		throw new RoomHttpError("unauthenticated", "sign in first");
	}
	return { displayName: session.data.user.name ?? "" };
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
	const response = await fetch(new URL("/rooms", `${apiOrigin()}/`).toString(), {
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
		new URL(`/rooms/${normalizeRoomCode(code)}/join`, `${apiOrigin()}/`).toString(),
		{
			method: "POST",
			credentials: "include",
		},
	);
	return readTicket(response);
}

function errorFromCode(code: RoomErrorCode, t: Translate, seconds?: number): string {
	switch (code) {
		case "unauthenticated":
			return t("guestSession");
		case "unknownRoom":
			return t("unknownRoom");
		case "roomFull":
			return t("roomFull");
		case "alreadyStarted":
			return t("alreadyStarted");
		case "notSeated":
			return t("notSeated");
		case "notHost":
			return t("notHost");
		case "notReady":
			return t("notReady");
		case "reconnectBlocked":
			return seconds === undefined ? t("reconnectWaitSoon") : t("reconnectWait", { seconds });
		case "illegalIntent":
			return t("unknownIntent");
		default:
			return t(code);
	}
}

export function roomErrorCopy(error: unknown, t: Translate): string {
	if (!(error instanceof RoomHttpError)) {
		return t("roomNetwork");
	}
	if (error.code === "unexpected") {
		return t("openRoomFailed");
	}
	const seconds =
		error.code === "reconnectBlocked" ? Number(error.message.match(/\d+/)?.[0]) : Number.NaN;
	return errorFromCode(error.code, t, Number.isFinite(seconds) ? seconds : undefined);
}

export function tableErrorCopy(error: TableError, t: Translate): string {
	return errorFromCode(error.code, t, error.seconds);
}
