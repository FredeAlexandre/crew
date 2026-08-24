import type { TableView } from "@crew/view-model/fixtures";

type TrickCard = TableView["trick"]["cards"][number];
type SeatRegion = TrickCard["region"];

export function trickCardKey(card: Pick<TrickCard, "seatId" | "order">): string {
	return `${card.seatId}:${card.order}`;
}

type TrickJuice = {
	landKeys: string[];
	holdCards: TrickCard[] | null;
	winnerRegion: SeatRegion | null;
	playWin: boolean;
};

export function trickJuice(prev: TableView | null, next: TableView): TrickJuice {
	if (prev === null || prev.attemptId !== next.attemptId) {
		return { landKeys: [], holdCards: null, winnerRegion: null, playWin: false };
	}

	const previousKeys = new Set(prev.trick.cards.map(trickCardKey));
	const landKeys = next.trick.cards.map(trickCardKey).filter((key) => !previousKeys.has(key));
	const playWin = next.lastTrick !== null && next.lastTrick.trickId !== prev.lastTrick?.trickId;
	if (playWin && next.trick.cards.length === 0 && next.lastTrick !== null) {
		return {
			landKeys: [],
			holdCards: next.lastTrick.cards,
			winnerRegion: next.lastTrick.winnerRegion,
			playWin: true,
		};
	}
	return { landKeys, holdCards: null, winnerRegion: null, playWin };
}
