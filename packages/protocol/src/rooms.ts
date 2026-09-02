import { z } from "zod";

export const PLAYER_COUNTS = [3, 4, 5] as const;
export type PlayerCount = (typeof PLAYER_COUNTS)[number];

export const playerCountSchema = z.union([z.literal(3), z.literal(4), z.literal(5)]);

export const ROOM_CODE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
export const ROOM_CODE_MIN_LENGTH = 4;
export const ROOM_CODE_MAX_LENGTH = 6;

const roomCodePattern = new RegExp(
	`^[${ROOM_CODE_ALPHABET}]{${ROOM_CODE_MIN_LENGTH},${ROOM_CODE_MAX_LENGTH}}$`,
);

export const roomCodeSchema = z.string().regex(roomCodePattern);

export function normalizeRoomCode(raw: string): string {
	const allowed = new Set(ROOM_CODE_ALPHABET);
	let out = "";
	for (const char of raw.toUpperCase()) {
		if (!allowed.has(char)) {
			continue;
		}
		out += char;
		if (out.length === ROOM_CODE_MAX_LENGTH) {
			break;
		}
	}
	return out;
}

export function isRoomCode(value: string): boolean {
	return roomCodeSchema.safeParse(value).success;
}

export const playModeSchema = z.enum(["freePlay", "campaign"]);
export type PlayMode = z.infer<typeof playModeSchema>;

export const createRoomRequestSchema = z.object({
	playerCount: playerCountSchema,
	mode: playModeSchema.optional().default("freePlay"),
});

export const roomTicketSchema = z.object({
	code: roomCodeSchema,
	playerCount: playerCountSchema,
	wsPath: z.string().startsWith("/room/"),
});

export type RoomTicket = z.infer<typeof roomTicketSchema>;
