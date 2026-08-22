import { normalizeRoomCode } from "@crew/protocol";

const LOBBY_PATH_CODE = /\/lobby\/([^/?#]+)/i;

export function extractLobbyCode(raw: string): string {
	const match = raw.trim().match(LOBBY_PATH_CODE);
	if (match?.[1] !== undefined) {
		return normalizeRoomCode(match[1]);
	}
	return normalizeRoomCode(raw);
}

export function lobbyShareUrl(code: string, origin: string): string {
	return new URL(`/lobby/${normalizeRoomCode(code)}`, origin).href;
}
