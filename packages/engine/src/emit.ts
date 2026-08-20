import type { Fact } from "@crew/protocol";
import type { EngineState } from "./state.ts";

type FactInput = {
	[T in Fact as T["type"]]: Omit<T, "attemptId" | "seq">;
}[Fact["type"]];

export function emit(state: EngineState, facts: Fact[], fact: FactInput): void {
	state.seq += 1;
	facts.push({
		...fact,
		attemptId: state.attemptId,
		seq: state.seq,
	} as Fact);
}
