/**
 * Pure rules for *The Crew: Mission Deep Sea*.
 * No DOM, no `node:fs`, no wall-clock. Seeded RNG only.
 */

export type { AttemptId, CardId, Fact, IllegalReason, Intent, SeatId } from "@crew/protocol";

export { apply } from "./apply.ts";
export type { CreateAttemptConfig } from "./attempt.ts";
export { createAttempt } from "./attempt.ts";
export { pickSeatIntent } from "./bot.ts";
export { legalIntents } from "./legality.ts";
export type {
	ApplyErr,
	ApplyOk,
	ApplyResult,
	EngineState,
	MissionDef,
	MissionFlags,
	Phase,
	PlayerCount,
} from "./state.ts";
export type { TaskSpec } from "./tasks/catalog.ts";
export { TASK_BY_ID, TASK_CATALOG, taskCost } from "./tasks/catalog.ts";
