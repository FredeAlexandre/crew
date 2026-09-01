import type { TaskId, TaskPublic } from "@crew/protocol";
import type { Rng } from "../rng.ts";
import { shuffle } from "../rng.ts";
import type { PlayerCount } from "../state.ts";
import { TASK_BY_ID, TASK_CATALOG, type TaskSpec, taskCost } from "./catalog.ts";

export function drawTasks(
	rng: Rng,
	playerCount: PlayerCount,
	difficulty: number,
): { drawn: TaskSpec[]; remaining: TaskId[] } {
	const order = shuffle(
		TASK_CATALOG.map((spec) => spec.id),
		rng,
	);
	const selected: TaskSpec[] = [];
	const skipped: TaskId[] = [];
	let queue = [...order];
	let sum = 0;

	while (sum < difficulty) {
		if (queue.length === 0) {
			queue = skipped.filter((taskId) => {
				const spec = TASK_BY_ID[taskId];
				return spec !== undefined && taskCost(spec, playerCount) <= difficulty - sum;
			});
			if (queue.length === 0) {
				throw new Error(`Cannot draw tasks summing to difficulty ${difficulty}`);
			}
		}
		const taskId = queue.shift();
		if (taskId === undefined) {
			break;
		}
		const spec = TASK_BY_ID[taskId];
		if (spec === undefined) {
			continue;
		}
		const cost = taskCost(spec, playerCount);
		if (sum + cost <= difficulty) {
			selected.push(spec);
			sum += cost;
		} else {
			skipped.push(taskId);
		}
	}

	const used = new Set(selected.map((spec) => spec.id));
	const remaining = [...queue, ...skipped].filter((taskId) => !used.has(taskId));
	return { drawn: selected, remaining };
}

function uniqueCardTargets(spec: TaskPublic): string[] {
	if (spec.kind === "winCards") {
		return [...spec.cards];
	}
	if (spec.kind === "winWith") {
		const ids: string[] = [];
		if (spec.card !== undefined) {
			ids.push(spec.card);
		}
		if (spec.captureCard !== undefined) {
			ids.push(spec.captureCard);
		}
		return ids;
	}
	if (spec.kind === "winSubmarines" && spec.onlyCard !== undefined) {
		return [spec.onlyCard];
	}
	return [];
}

export function structurallyImpossible(tasks: readonly TaskPublic[]): boolean {
	const cards = new Set<string>();
	let firstTricks = 0;
	let lastTricks = 0;
	for (const spec of tasks) {
		for (const card of uniqueCardTargets(spec)) {
			if (cards.has(card)) {
				return true;
			}
			cards.add(card);
		}
		if (spec.kind === "nthTrick" && spec.n === 1) {
			firstTricks += 1;
		}
		if (spec.kind === "nthTrick" && (spec.n === 0 || spec.alsoLast === true)) {
			lastTricks += 1;
		}
	}
	return firstTricks > 1 || lastTricks > 1;
}

export function pickReplacement(
	remaining: TaskId[],
	playerCount: PlayerCount,
	cost: number,
	drawn: readonly TaskPublic[],
): TaskSpec | null {
	for (let i = 0; i < remaining.length; i += 1) {
		const taskId = remaining[i];
		if (taskId === undefined) {
			continue;
		}
		const spec = TASK_BY_ID[taskId];
		if (spec === undefined || taskCost(spec, playerCount) !== cost) {
			continue;
		}
		if (!structurallyImpossible([...drawn, spec])) {
			remaining.splice(i, 1);
			return spec;
		}
	}
	return null;
}
