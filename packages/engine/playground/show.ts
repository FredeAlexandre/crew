import type { EngineState, Fact, Intent } from "../src/index.ts";

/** These scripts live inside `@crew/engine`, so they import `../src`. Consumers use `@crew/engine`. */

export function heading(text: string): void {
	console.log(`\n── ${text}`);
}

export function note(text: string): void {
	console.log(`   ${text}`);
}

export function showFacts(facts: readonly Fact[]): void {
	if (facts.length === 0) {
		note("(no facts)");
		return;
	}
	const dealt = facts.filter((fact) => fact.type === "card.dealt").length;
	if (dealt >= 8) {
		note(`card.dealt × ${dealt}`);
	}
	for (const fact of facts) {
		if (fact.type === "card.dealt" && dealt >= 8) {
			continue;
		}
		note(formatFact(fact));
	}
}

export function showIntents(intents: readonly Intent[]): void {
	if (intents.length === 0) {
		note("(none)");
		return;
	}
	for (const intent of intents) {
		note(formatIntent(intent));
	}
}

export function showTable(state: EngineState): void {
	const result = state.result === null ? "-" : state.result;
	note(
		`attempt ${state.attemptId}  seq ${state.seq}  phase ${state.phase}  result ${result}` +
			(state.failReason !== null ? `  (${state.failReason})` : ""),
	);
	note(`captain seat ${state.captainSeat}   turn seat ${state.currentSeat}`);
	if (state.ledSuit !== null || state.currentTrick.length > 0) {
		const cards = state.currentTrick.map((play) => `seat ${play.seatId}=${play.cardId}`).join("  ");
		note(`trick ${state.trickId}  led ${state.ledSuit ?? "-"}  ${cards}`);
	}

	heading("hands");
	for (let seat = 0; seat < state.playerCount; seat += 1) {
		const cards = state.hands[seat] ?? [];
		const mark = seat === state.captainSeat ? "  captain" : "";
		const turn = seat === state.currentSeat ? "  ← turn" : "";
		note(`seat ${seat}  ${cards.join("  ")}${mark}${turn}`);
	}

	heading("tasks");
	if (state.tasks.length === 0) {
		note("(none)");
		return;
	}
	for (const task of state.tasks) {
		const where = task.ownerSeat === null ? "center" : `seat ${task.ownerSeat}`;
		note(`${task.instanceId}  ${where}  ${task.status}  ${formatTask(task.spec)}`);
	}
}

export function showSonar(state: EngineState): void {
	for (let seat = 0; seat < state.playerCount; seat += 1) {
		const slot = state.sonar[seat];
		if (slot === undefined) {
			continue;
		}
		if (slot.communication === null) {
			note(`seat ${seat}  available=${slot.available}  (silent)`);
			continue;
		}
		note(
			`seat ${seat}  available=${slot.available}  ${slot.communication.cardId} is ${slot.communication.position}`,
		);
	}
}

function formatFact(fact: Fact): string {
	const { type, seq, ...rest } = fact;
	return `#${seq}  ${type}  ${formatFields(omit(rest, ["attemptId"]))}`;
}

function formatIntent(intent: Intent): string {
	const { type, ...rest } = intent;
	const fields = formatFields(omit(rest, ["attemptId"]));
	return fields === "" ? type : `${type}  ${fields}`;
}

function formatTask(spec: EngineState["tasks"][number]["spec"]): string {
	const { id, ...rest } = spec;
	return `${id}  ${formatFields(omit(rest, ["difficulty", "captainMaySelect"]))}`;
}

function omit(value: object, keys: readonly string[]): object {
	return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}

function formatFields(value: object): string {
	return Object.entries(value)
		.filter(([, field]) => field !== undefined)
		.map(([key, field]) => `${key}=${stringify(field)}`)
		.join("  ");
}

function stringify(value: unknown): string {
	if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
		return String(value);
	}
	return JSON.stringify(value);
}
