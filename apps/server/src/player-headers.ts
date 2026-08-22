export const PLAYER_ID_HEADER = "x-crew-player-id";
export const DISPLAY_NAME_HEADER = "x-crew-display-name";

export function playerHeaders(playerId: string, displayName: string): Record<string, string> {
	return {
		[PLAYER_ID_HEADER]: playerId,
		[DISPLAY_NAME_HEADER]: encodeURIComponent(displayName),
	};
}

export function readPlayerHeaders(
	headers: Headers,
): { playerId: string; displayName: string } | null {
	const playerId = headers.get(PLAYER_ID_HEADER)?.trim();
	const encoded = headers.get(DISPLAY_NAME_HEADER);
	if (playerId === undefined || playerId === "" || encoded === null) {
		return null;
	}
	return { playerId, displayName: decodeURIComponent(encoded) };
}
