/**
 * Pure rules. Deal, turns, legality, and tasks land in later engine tasks.
 * No DOM, no `node:fs`, no wall-clock.
 */
export type { AttemptId } from "@crew/protocol";

export type EngineState = {
	readonly version: 0;
};

export function emptyState(): EngineState {
	return { version: 0 };
}
