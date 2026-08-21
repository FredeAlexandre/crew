/**
 * 3 — affordances (what this client may do)
 *
 *   nub ./3-affordances/index.ts
 *
 * The skin binds buttons to these flags. It does not re-derive rules from the engine.
 */
import { legalIntents } from "@crew/engine";
import { project } from "../../src/project.ts";
import { heading, note, showAffordances, showView } from "../show.ts";
import { applyOk, completeDraft, seedFromArgv, startAttempt } from "../steps.ts";

const seed = seedFromArgv(1);
const started = startAttempt(seed, 4, 4);
const captain = started.state.captainSeat ?? 0;
const other = ((captain + 1) % started.state.playerCount) as 0 | 1 | 2 | 3 | 4;

heading(`taskDraft  seed=${seed}  captain engine-seat ${captain}`);
const draft = project(started.state, captain);
note("captain");
showAffordances(draft);
note(`center tasks takeable: ${draft.centerTasks.filter((task) => task.takeable).length}`);
note("other seat");
showAffordances(project(started.state, other));

const afterDraft = completeDraft(started.state);
heading(`distress overlay  phase ${afterDraft.phase}`);
const offer = project(afterDraft, 0);
showView(offer);

heading("activate left — overlay stays distress, cards become passable");
const passing = applyOk(afterDraft, {
	type: "distress.activate",
	attemptId: afterDraft.attemptId,
	seatId: 0,
	direction: "left",
}).state;
const passView = project(passing, passing.currentSeat ?? 0);
showAffordances(passView);
note(
	`legal pass cards: ${passView.hand
		.filter((card) => card.legal)
		.map((card) => card.cardId)
		.join("  ")}`,
);
note(
	`muted submarines: ${
		passView.hand
			.filter((card) => card.illegalReason === "cannotPassSubmarine")
			.map((card) => card.cardId)
			.join("  ") || "(none in hand)"
	}`,
);
note(
	`engine legalIntents count ${legalIntents(passing, passing.currentSeat ?? 0).length} — same source as the flags.`,
);
note("next:  nub ./4-play-trick/index.ts");
