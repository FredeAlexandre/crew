/**
 * 2 — projectFacts()
 *
 *   nub ./2-facts/index.ts
 *
 * Engine facts always include card ids. The wire copy for a seat must not.
 * Consumers: `import { projectFacts } from "@crew/view-model/project"`.
 */
import { projectFacts } from "../../src/project.ts";
import { heading, note } from "../show.ts";
import { seedFromArgv, startAttempt } from "../steps.ts";

const seed = seedFromArgv(1);
const { facts } = startAttempt(seed);
const viewerSeat = 2;
const projected = projectFacts(facts, viewerSeat);

heading(`createAttempt facts  seed=${seed}  viewer engine-seat ${viewerSeat}`);
note(`engine emitted ${facts.length} facts; projector kept ${projected.length}`);

const dealt = projected.filter((fact) => fact.type === "card.dealt");
const visible = dealt.filter((fact) => fact.cardId !== undefined);
const hidden = dealt.filter((fact) => fact.cardId === undefined);
note(`card.dealt × ${dealt.length}  with cardId ${visible.length}  stripped ${hidden.length}`);
note("only the viewer's own dealt cards keep cardId — everyone else is a count.");

const sampleHidden = hidden[0];
const sampleVisible = visible[0];
if (sampleVisible !== undefined && sampleVisible.type === "card.dealt") {
	note(
		`kept    seat ${sampleVisible.seatId}  ${sampleVisible.cardId}  index ${sampleVisible.index}`,
	);
}
if (sampleHidden !== undefined && sampleHidden.type === "card.dealt") {
	note(`stripped seat ${sampleHidden.seatId}  cardId omitted  index ${sampleHidden.index}`);
}

heading("other facts stay public");
for (const fact of projected) {
	if (fact.type === "card.dealt") {
		continue;
	}
	note(`#${fact.seq}  ${fact.type}`);
}

note("card.passed is the same rule: cardId only if this client sent or received.");
note("next:  nub ./3-affordances/index.ts");
