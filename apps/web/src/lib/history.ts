import { env } from "@crew/env/web";

export type HistoryEntry = {
	missionId: string;
	attemptId: string;
	result: "won" | "failed";
	roomCode: string;
	playerCount: number;
	completedAt: string;
};

export async function readPlayerHistory(): Promise<HistoryEntry[]> {
	const response = await fetch(new URL("/history", `${env.VITE_SERVER_URL.replace(/\/$/, "")}/`), {
		credentials: "include",
	});
	if (!response.ok) {
		throw new Error("Could not load player history.");
	}
	const body = (await response.json()) as { history?: HistoryEntry[] };
	return Array.isArray(body.history) ? body.history : [];
}
