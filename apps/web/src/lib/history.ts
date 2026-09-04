import { apiOrigin } from "./api-origin.ts";
import type { HistoryGame } from "./history-game.ts";
import { parseHistoryGame } from "./history-game.ts";
import type { HistoryEntry } from "./history-group.ts";

export type { HistoryGame } from "./history-game.ts";
export type { HistoryEntry } from "./history-group.ts";

export async function readPlayerHistory(): Promise<HistoryEntry[]> {
	const response = await fetch(new URL("/api/history", `${apiOrigin()}/`), {
		credentials: "include",
	});
	if (!response.ok) {
		throw new Error("Could not load player history.");
	}
	const body = (await response.json()) as { history?: HistoryEntry[] };
	return Array.isArray(body.history) ? body.history : [];
}

export async function readPlayerGame(attemptId: string): Promise<HistoryGame> {
	const response = await fetch(new URL(`/api/history/${attemptId}`, `${apiOrigin()}/`), {
		credentials: "include",
	});
	if (response.status === 404) {
		throw new Error("unknownHistory");
	}
	if (!response.ok) {
		throw new Error("Could not load this attempt.");
	}
	const game = parseHistoryGame(await response.json());
	if (game === null) {
		throw new Error("Could not load this attempt.");
	}
	return game;
}
