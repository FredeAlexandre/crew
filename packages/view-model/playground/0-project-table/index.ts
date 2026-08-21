/**
 * 0 — project()
 *
 * From packages/view-model/playground:
 *   nub ./0-project-table/index.ts
 *   nub ./0-project-table/index.ts 11
 *
 * The Room sends this object as room.snapshot. The skin never sees EngineState.
 * Consumers: `import { project } from "@crew/view-model/project"`.
 */
import { project } from "../../src/project.ts";
import { heading, note, showView } from "../show.ts";
import { seedFromArgv, startAttempt } from "../steps.ts";

const seed = seedFromArgv(1);
const { state } = startAttempt(seed);
const captain = state.captainSeat ?? 0;
const view = project(state, captain);

heading(`project  seed=${seed}  viewer=captain (engine-seat ${captain})`);
showView(view);

heading("what just happened");
note(`scene is ${view.scene}: engine phase ${state.phase} mapped onto the presentation scene.`);
note(
	"seats are rotated — region seat.self is this client, even when their engine seatId is not 0.",
);
note("next:  nub ./1-two-viewers/index.ts");
