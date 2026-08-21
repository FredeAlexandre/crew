import type { EngineState } from "@crew/engine";

/**
 * Per-seat projection. Real hiding of hands lands in `view-model`.
 * Server-only — `apps/web` must not import this file.
 */
export type TableView = {
	readonly viewerSeat: number;
	readonly phase: EngineState["phase"];
	readonly playerCount: number;
};

export function project(state: EngineState, viewerSeat: number): TableView {
	return {
		viewerSeat,
		phase: state.phase,
		playerCount: state.playerCount,
	};
}
