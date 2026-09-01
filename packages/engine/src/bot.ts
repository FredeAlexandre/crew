import type { Intent, PlayIntent, SeatId } from "@crew/protocol";
import { legalIntents } from "./legality.ts";
import type { EngineState } from "./state.ts";

const RANK: Partial<Record<Intent["type"], number>> = {
	"card.play": 0,
	"task.predict": 0,
	"task.take": 1,
	"task.pass": 2,
	"distress.passCard": 3,
	"distress.skip": 4,
};

/**
 * First legal seat action for a dummy teammate.
 * Skips sonar and distress activation so a human tester still sees those choices.
 */
export function pickSeatIntent(state: EngineState, seat: SeatId): PlayIntent | null {
	let best: PlayIntent | null = null;
	let bestRank = Number.POSITIVE_INFINITY;
	for (const intent of legalIntents(state, seat)) {
		if (!isDummyIntent(intent)) {
			continue;
		}
		const rank = intent.type === "task.predict" ? (intent.count === 1 ? 0 : 20) : RANK[intent.type];
		if (rank === undefined || rank >= bestRank) {
			continue;
		}
		best = intent;
		bestRank = rank;
	}
	return best;
}

function isDummyIntent(intent: Intent): intent is PlayIntent {
	return RANK[intent.type] !== undefined;
}
