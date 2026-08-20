import type { CardId, ColorSuit, DifficultyByPlayers, TaskId, TaskPublic } from "@crew/protocol";
import { COLOR_SUITS } from "../deck.ts";

export type TaskSpec = TaskPublic;

type TaskInput = {
	[K in TaskSpec as K["kind"]]: Omit<K, "id">;
}[TaskSpec["kind"]];

function d(n: number): DifficultyByPlayers {
	return { 3: n, 4: n, 5: n };
}

function id(n: number): TaskId {
	return `t${String(n).padStart(2, "0")}`;
}

const catalog: TaskSpec[] = [];
let nextId = 1;

function push(spec: TaskInput): void {
	catalog.push({ ...spec, id: id(nextId) } as TaskSpec);
	nextId += 1;
}

for (const suit of COLOR_SUITS) {
	for (const value of [1, 2, 5, 8, 9] as const) {
		const card = `${suit}-${value}` as CardId;
		push({
			kind: "winCards",
			cards: [card],
			difficulty: d(value <= 2 ? 1 : value === 5 ? 2 : 3),
			captainMaySelect: true,
		});
	}
}

const pairs: [CardId, CardId][] = [
	["pink-1", "pink-9"],
	["yellow-1", "yellow-9"],
	["green-4", "green-5"],
	["blue-8", "blue-9"],
	["pink-3", "yellow-3"],
	["green-7", "blue-7"],
	["pink-9", "submarine-1"],
	["yellow-5", "green-5"],
];
for (const cards of pairs) {
	push({
		kind: "winCards",
		cards,
		difficulty: d(3),
		captainMaySelect: true,
	});
}

for (const suit of COLOR_SUITS) {
	push({
		kind: "winColor",
		suit,
		count: 1,
		difficulty: d(1),
		captainMaySelect: true,
	});
}

push({
	kind: "winColor",
	suit: "pink",
	count: 3,
	difficulty: d(3),
	captainMaySelect: true,
});
push({
	kind: "winColor",
	suit: "blue",
	count: 4,
	difficulty: d(4),
	captainMaySelect: true,
});

for (const value of [1, 5, 9] as const) {
	push({
		kind: "winValue",
		value,
		count: 1,
		difficulty: d(value === 9 ? 2 : 1),
		captainMaySelect: true,
	});
}

push({
	kind: "winSubmarines",
	count: 1,
	difficulty: d(2),
	captainMaySelect: true,
});
push({
	kind: "winSubmarines",
	count: 2,
	difficulty: d(4),
	captainMaySelect: true,
});

push({
	kind: "winWith",
	value: 1,
	difficulty: d(2),
	captainMaySelect: true,
});
push({
	kind: "winWith",
	value: 9,
	difficulty: d(3),
	captainMaySelect: true,
});
push({
	kind: "winWith",
	suit: "submarine",
	difficulty: d(3),
	captainMaySelect: true,
});
push({
	kind: "winWith",
	card: "pink-9",
	difficulty: d(3),
	captainMaySelect: true,
});
push({
	kind: "winWith",
	suit: "green",
	value: 1,
	difficulty: d(2),
	captainMaySelect: true,
});
push({
	kind: "winWith",
	suit: "yellow",
	difficulty: d(2),
	captainMaySelect: true,
});

for (const suit of COLOR_SUITS) {
	push({
		kind: "avoid",
		suit,
		difficulty: d(2),
		captainMaySelect: true,
	});
}
push({
	kind: "avoid",
	value: 9,
	difficulty: d(2),
	captainMaySelect: true,
});
push({
	kind: "avoid",
	submarines: true,
	difficulty: d(3),
	captainMaySelect: true,
});

for (const count of [0, 1, 2, 3] as const) {
	push({
		kind: "trickCount",
		op: "exact",
		count,
		difficulty: d(count === 0 ? 3 : count),
		captainMaySelect: true,
	});
}
for (const count of [1, 2, 3] as const) {
	push({
		kind: "trickCount",
		op: "atLeast",
		count,
		difficulty: d(count),
		captainMaySelect: true,
	});
}
push({
	kind: "trickCount",
	op: "atMost",
	count: 1,
	difficulty: d(2),
	captainMaySelect: true,
});

push({
	kind: "consecutiveTricks",
	count: 2,
	difficulty: d(2),
	captainMaySelect: true,
});
push({
	kind: "consecutiveTricks",
	count: 3,
	difficulty: d(4),
	captainMaySelect: true,
});

push({
	kind: "nthTrick",
	n: 1,
	difficulty: d(1),
	captainMaySelect: true,
});
push({
	kind: "nthTrick",
	n: 0,
	difficulty: d(2),
	captainMaySelect: true,
});
push({
	kind: "nthTrick",
	n: 2,
	difficulty: d(2),
	captainMaySelect: true,
});
push({
	kind: "nthTrick",
	n: 3,
	difficulty: d(2),
	captainMaySelect: true,
});

push({
	kind: "compareTricks",
	op: "moreThan",
	vs: "captain",
	difficulty: d(3),
	captainMaySelect: false,
});
push({
	kind: "compareTricks",
	op: "fewerThan",
	vs: "captain",
	difficulty: d(3),
	captainMaySelect: false,
});
push({
	kind: "compareTricks",
	op: "equalTo",
	vs: "captain",
	difficulty: d(2),
	captainMaySelect: false,
});
push({
	kind: "compareTricks",
	op: "moreThan",
	vs: "eachOther",
	difficulty: d(4),
	captainMaySelect: true,
});
push({
	kind: "compareTricks",
	op: "fewerThan",
	vs: "eachOther",
	difficulty: d(3),
	captainMaySelect: true,
});

for (const spec of [
	{ op: "gt" as const, target: 20, noSubmarines: true, difficulty: d(3) },
	{ op: "lt" as const, target: 12, noSubmarines: true, difficulty: d(3) },
	{ op: "eq" as const, target: 15, noSubmarines: false, difficulty: d(4) },
	{ op: "gt" as const, target: 16, noSubmarines: false, difficulty: d(2) },
	{ op: "lt" as const, target: 10, noSubmarines: false, difficulty: d(2) },
	{ op: "eq" as const, target: 21, noSubmarines: true, difficulty: d(4) },
]) {
	push({
		kind: "trickSum",
		...spec,
		captainMaySelect: true,
	});
}

push({
	kind: "trickFilter",
	filter: "allGt",
	bound: 4,
	noSubmarines: true,
	difficulty: d(3),
	captainMaySelect: true,
});
push({
	kind: "trickFilter",
	filter: "allLt",
	bound: 5,
	noSubmarines: true,
	difficulty: d(3),
	captainMaySelect: true,
});
push({
	kind: "trickFilter",
	filter: "allOdd",
	noSubmarines: true,
	difficulty: d(3),
	captainMaySelect: true,
});
push({
	kind: "trickFilter",
	filter: "allEven",
	noSubmarines: true,
	difficulty: d(3),
	captainMaySelect: true,
});
push({
	kind: "trickFilter",
	filter: "allGt",
	bound: 6,
	noSubmarines: false,
	difficulty: d(4),
	captainMaySelect: true,
});
push({
	kind: "trickFilter",
	filter: "allOdd",
	noSubmarines: false,
	difficulty: d(4),
	captainMaySelect: true,
});

push({
	kind: "collectAllColors",
	difficulty: d(3),
	captainMaySelect: true,
});
push({
	kind: "collectAllOfOneColor",
	difficulty: d(4),
	captainMaySelect: true,
});

const morePairs: [ColorSuit, ColorSuit][] = [
	["pink", "yellow"],
	["green", "blue"],
	["blue", "pink"],
];
for (const [more, less] of morePairs) {
	push({
		kind: "collectMoreColor",
		more,
		less,
		difficulty: d(2),
		captainMaySelect: true,
	});
}

export const TASK_CATALOG: readonly TaskSpec[] = catalog;

export const TASK_BY_ID: Readonly<Record<string, TaskSpec>> = Object.fromEntries(
	TASK_CATALOG.map((spec) => [spec.id, spec]),
);

export function taskCost(spec: TaskSpec, playerCount: 3 | 4 | 5): number {
	return spec.difficulty[playerCount];
}
