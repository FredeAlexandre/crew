import type { Fact } from "@crew/protocol";
import { emit } from "./emit.ts";
import { type ApplyOk, cloneState, type EngineState } from "./state.ts";

/** Ends the current attempt as a failed mission after an accepted abandon vote. */
export function abandonMission(state: EngineState): ApplyOk {
	const next = cloneState(state);
	const facts: Fact[] = [];
	next.phase = "result";
	next.result = "failed";
	next.failReason = "abandoned";
	next.currentSeat = null;
	emit(next, facts, {
		type: "mission.failed",
		missionId: next.mission?.id ?? "1",
		reason: "abandoned",
	});
	return { ok: true, state: next, facts };
}
