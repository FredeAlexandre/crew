import { env } from "@crew/env/web";

export type CampaignSummary = {
	id: string;
	logbookId: string;
	status: "active" | "completed";
	stepIndex: number;
	stepCount: number;
	playerCount: number;
	crew: string[];
	attemptTotals: number;
	lastPlayed: string;
	roomCode: string;
};

export async function readPlayerCampaigns(): Promise<{
	campaigns: CampaignSummary[];
	isGuest: boolean;
}> {
	const response = await fetch(
		new URL("/campaigns", `${env.VITE_SERVER_URL.replace(/\/$/, "")}/`),
		{
			credentials: "include",
		},
	);
	if (response.status === 401 || response.status === 403) {
		return { campaigns: [], isGuest: true };
	}
	if (!response.ok) {
		throw new Error("Could not load campaigns.");
	}
	const body = (await response.json()) as { campaigns?: CampaignSummary[] };
	return { campaigns: Array.isArray(body.campaigns) ? body.campaigns : [], isGuest: false };
}
