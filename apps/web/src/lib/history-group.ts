export type HistoryEntry = {
	missionId: string;
	attemptId: string;
	result: "won" | "failed";
	roomCode: string;
	playerCount: number;
	completedAt: string;
};

type HistoryDayGroup = {
	day: string;
	entries: HistoryEntry[];
};

export function localDayKey(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

export function groupHistoryByDay(entries: HistoryEntry[]): HistoryDayGroup[] {
	const groups = new Map<string, HistoryEntry[]>();
	for (const entry of entries) {
		const date = new Date(entry.completedAt);
		if (Number.isNaN(date.valueOf())) {
			continue;
		}
		const key = localDayKey(date);
		const list = groups.get(key);
		if (list === undefined) {
			groups.set(key, [entry]);
		} else {
			list.push(entry);
		}
	}
	return [...groups.entries()]
		.sort(([left], [right]) => (left < right ? 1 : left > right ? -1 : 0))
		.map(([day, dayEntries]) => ({
			day,
			entries: [...dayEntries].sort((left, right) =>
				left.completedAt < right.completedAt ? 1 : left.completedAt > right.completedAt ? -1 : 0,
			),
		}));
}

export function missionNumber(missionId: string): string {
	return missionId.replace(/^m/i, "");
}
