import { apiOrigin } from "./api-origin.ts";
import type { HistoryEntry } from "./history-group.ts";

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
