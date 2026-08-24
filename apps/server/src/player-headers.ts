export const PLAYER_ID_HEADER = "x-crew-player-id";
export const DISPLAY_NAME_HEADER = "x-crew-display-name";
export const PLAYER_IMAGE_HEADER = "x-crew-player-image";

export function playerHeaders(
	playerId: string,
	displayName: string,
	image: string | null = null,
): Record<string, string> {
	return {
		[PLAYER_ID_HEADER]: playerId,
		[DISPLAY_NAME_HEADER]: encodeURIComponent(displayName),
		...(image === null ? {} : { [PLAYER_IMAGE_HEADER]: encodeURIComponent(image) }),
	};
}

export function readPlayerHeaders(
	headers: Headers,
): { playerId: string; displayName: string; image?: string } | null {
	const playerId = headers.get(PLAYER_ID_HEADER)?.trim();
	const encoded = headers.get(DISPLAY_NAME_HEADER);
	if (playerId === undefined || playerId === "" || encoded === null) {
		return null;
	}
	const image = headers.get(PLAYER_IMAGE_HEADER);
	return image === null
		? { playerId, displayName: decodeURIComponent(encoded) }
		: { playerId, displayName: decodeURIComponent(encoded), image: decodeURIComponent(image) };
}
