import type { EngineState } from "@crew/engine";
import type { HelloFixture } from "./fixtures/hello.ts";
import { helloFixture } from "./fixtures/hello.ts";

/**
 * Per-seat projection. Real hiding of hands lands in `view-model`.
 * Server-only — web must import `@crew/view-model/fixtures`, not this file.
 */
export function project(_state: EngineState, _viewerSeat: number): HelloFixture {
	return helloFixture;
}
