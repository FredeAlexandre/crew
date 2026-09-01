import type { DifficultyByPlayers, TaskId, TaskPublic } from "@crew/protocol";

export type TaskSpec = TaskPublic;

type TaskInput = TaskSpec extends infer T
	? T extends { id: TaskId }
		? Omit<T, "id">
		: never
	: never;

function d(three: number, four: number, five: number): DifficultyByPlayers {
	return { 3: three, 4: four, 5: five };
}

function id(n: number): TaskId {
	return `t${String(n).padStart(2, "0")}`;
}

const catalog: TaskSpec[] = [];

function push(spec: TaskInput): void {
	catalog.push({ ...spec, id: id(catalog.length + 1) } as TaskSpec);
}

const yes = true;
const no = false;

push({
	kind: "compareTricks",
	op: "moreThan",
	vs: "eachOther",
	difficulty: d(2, 3, 3),
	captainMaySelect: yes,
});
push({
	kind: "compareTricks",
	op: "moreThan",
	vs: "othersCombined",
	difficulty: d(3, 4, 5),
	captainMaySelect: yes,
});
push({
	kind: "compareTricks",
	op: "fewerThan",
	vs: "eachOther",
	difficulty: d(2, 2, 3),
	captainMaySelect: yes,
});
push({
	kind: "compareTricks",
	op: "moreThan",
	vs: "captain",
	difficulty: d(2, 2, 3),
	captainMaySelect: no,
});
push({
	kind: "compareTricks",
	op: "fewerThan",
	vs: "captain",
	difficulty: d(2, 2, 2),
	captainMaySelect: no,
});
push({
	kind: "compareTricks",
	op: "equalTo",
	vs: "captain",
	difficulty: d(4, 3, 3),
	captainMaySelect: no,
});

push({
	kind: "trickFilter",
	filter: "allLt",
	bound: 7,
	noSubmarines: yes,
	difficulty: d(2, 3, 3),
	captainMaySelect: yes,
});
push({
	kind: "trickFilter",
	filter: "allGt",
	bound: 5,
	noSubmarines: no,
	difficulty: d(2, 3, 4),
	captainMaySelect: yes,
});
push({
	kind: "winWith",
	value: 6,
	difficulty: d(2, 3, 3),
	captainMaySelect: yes,
});
push({
	kind: "winWith",
	value: 5,
	difficulty: d(2, 3, 4),
	captainMaySelect: yes,
});
push({
	kind: "winWith",
	value: 3,
	difficulty: d(3, 4, 5),
	captainMaySelect: yes,
});
push({
	kind: "winWith",
	value: 7,
	captureValue: 5,
	difficulty: d(1, 2, 2),
	captainMaySelect: yes,
});
push({
	kind: "winWith",
	value: 4,
	captureValue: 8,
	difficulty: d(3, 4, 5),
	captainMaySelect: yes,
});
push({
	kind: "winWith",
	value: 6,
	captureValue: 6,
	difficulty: d(2, 3, 4),
	captainMaySelect: yes,
});
push({
	kind: "winWith",
	value: 2,
	difficulty: d(3, 4, 5),
	captainMaySelect: yes,
});

push({
	kind: "winCards",
	cards: ["pink-3"],
	difficulty: d(1, 1, 1),
	captainMaySelect: yes,
});
push({
	kind: "winCards",
	cards: ["yellow-1"],
	difficulty: d(1, 1, 1),
	captainMaySelect: yes,
});
push({
	kind: "winCards",
	cards: ["blue-4"],
	difficulty: d(1, 1, 1),
	captainMaySelect: yes,
});
push({
	kind: "winCards",
	cards: ["green-6"],
	difficulty: d(1, 1, 1),
	captainMaySelect: yes,
});
push({
	kind: "winValue",
	value: 3,
	count: 4,
	op: "exact",
	difficulty: d(3, 4, 5),
	captainMaySelect: yes,
});
push({
	kind: "winValue",
	value: 5,
	count: 3,
	op: "atLeast",
	difficulty: d(3, 4, 5),
	captainMaySelect: yes,
});
push({
	kind: "winValue",
	value: 9,
	count: 3,
	op: "atLeast",
	difficulty: d(3, 4, 5),
	captainMaySelect: yes,
});
push({
	kind: "winValue",
	value: 7,
	count: 2,
	op: "atLeast",
	difficulty: d(2, 2, 2),
	captainMaySelect: yes,
});
push({
	kind: "winValue",
	value: 9,
	count: 4,
	op: "exact",
	difficulty: d(4, 5, 6),
	captainMaySelect: yes,
});
push({
	kind: "winValue",
	value: 6,
	count: 3,
	op: "exact",
	difficulty: d(3, 4, 4),
	captainMaySelect: yes,
});
push({
	kind: "winValue",
	value: 9,
	count: 2,
	op: "exact",
	difficulty: d(2, 3, 3),
	captainMaySelect: yes,
});
push({
	kind: "winCards",
	cards: ["blue-1", "blue-2", "blue-3"],
	difficulty: d(2, 3, 3),
	captainMaySelect: yes,
});
push({
	kind: "winCards",
	cards: ["blue-6", "yellow-7"],
	difficulty: d(2, 2, 3),
	captainMaySelect: yes,
});
push({
	kind: "winCards",
	cards: ["pink-5", "yellow-6"],
	difficulty: d(2, 2, 3),
	captainMaySelect: yes,
});
push({
	kind: "winCards",
	cards: ["green-5", "blue-8"],
	difficulty: d(2, 2, 3),
	captainMaySelect: yes,
});
push({
	kind: "winCards",
	cards: ["blue-5", "pink-8"],
	difficulty: d(2, 2, 3),
	captainMaySelect: yes,
});
push({
	kind: "winCards",
	cards: ["pink-9", "yellow-8"],
	difficulty: d(2, 2, 3),
	captainMaySelect: yes,
});
push({
	kind: "winCards",
	cards: ["pink-1", "green-7"],
	difficulty: d(2, 2, 2),
	captainMaySelect: yes,
});
push({
	kind: "winCards",
	cards: ["yellow-9", "blue-7"],
	difficulty: d(2, 3, 3),
	captainMaySelect: yes,
});
push({
	kind: "winCards",
	cards: ["green-3", "yellow-4", "yellow-5"],
	difficulty: d(3, 4, 4),
	captainMaySelect: yes,
});
push({
	kind: "winCards",
	cards: ["green-2"],
	inTrick: 0,
	difficulty: d(3, 4, 5),
	captainMaySelect: yes,
});

push({
	kind: "winColors",
	parts: [
		{ suit: "pink", count: 1, op: "exact" },
		{ suit: "green", count: 1, op: "exact" },
	],
	difficulty: d(4, 4, 4),
	captainMaySelect: yes,
});
push({
	kind: "winColor",
	suit: "yellow",
	count: 7,
	op: "atLeast",
	difficulty: d(3, 3, 3),
	captainMaySelect: yes,
});
push({
	kind: "winColor",
	suit: "pink",
	count: 5,
	op: "atLeast",
	difficulty: d(2, 3, 3),
	captainMaySelect: yes,
});
push({
	kind: "winColor",
	suit: "green",
	count: 2,
	op: "exact",
	difficulty: d(3, 4, 4),
	captainMaySelect: yes,
});
push({
	kind: "winColor",
	suit: "blue",
	count: 2,
	op: "exact",
	difficulty: d(3, 4, 4),
	captainMaySelect: yes,
});
push({
	kind: "winColor",
	suit: "pink",
	count: 1,
	op: "exact",
	difficulty: d(3, 3, 4),
	captainMaySelect: yes,
});
push({
	kind: "avoid",
	suit: "pink",
	difficulty: d(2, 2, 2),
	captainMaySelect: yes,
});
push({
	kind: "collectAllColors",
	difficulty: d(2, 3, 4),
	captainMaySelect: yes,
});
push({
	kind: "collectAllOfOneColor",
	difficulty: d(3, 4, 5),
	captainMaySelect: yes,
});

push({
	kind: "trickFilter",
	filter: "allEven",
	noSubmarines: yes,
	difficulty: d(2, 5, 6),
	captainMaySelect: yes,
});
push({
	kind: "trickFilter",
	filter: "allOdd",
	noSubmarines: yes,
	difficulty: d(2, 4, 5),
	captainMaySelect: yes,
});

push({
	kind: "trickSum",
	op: "gt",
	target: d(23, 28, 31),
	noSubmarines: yes,
	difficulty: d(3, 3, 4),
	captainMaySelect: yes,
});
push({
	kind: "trickSum",
	op: "lt",
	target: d(8, 12, 16),
	noSubmarines: yes,
	difficulty: d(3, 3, 4),
	captainMaySelect: yes,
});
push({
	kind: "trickSum",
	op: "eq",
	targets: [22, 23],
	noSubmarines: no,
	difficulty: d(3, 3, 4),
	captainMaySelect: yes,
});

push({
	kind: "winSubmarines",
	count: 1,
	op: "exact",
	redealIf: "allSubmarines",
	difficulty: d(3, 3, 3),
	captainMaySelect: yes,
});
push({
	kind: "winSubmarines",
	count: 1,
	op: "exact",
	onlyCard: "submarine-1",
	redealIf: "sub1and4or123",
	difficulty: d(3, 3, 3),
	captainMaySelect: yes,
});
push({
	kind: "winSubmarines",
	count: 1,
	op: "exact",
	onlyCard: "submarine-2",
	redealIf: "sub2and4or123",
	difficulty: d(3, 3, 3),
	captainMaySelect: yes,
});
push({
	kind: "winCards",
	cards: ["submarine-3"],
	difficulty: d(1, 1, 1),
	captainMaySelect: yes,
});
push({
	kind: "winSubmarines",
	count: 2,
	op: "exact",
	redealIf: "sub234",
	difficulty: d(3, 3, 4),
	captainMaySelect: yes,
});
push({
	kind: "winSubmarines",
	count: 3,
	op: "exact",
	redealIf: "allSubmarines",
	difficulty: d(3, 4, 4),
	captainMaySelect: yes,
});
push({
	kind: "avoid",
	submarines: yes,
	difficulty: d(1, 1, 1),
	captainMaySelect: yes,
});
push({
	kind: "winWith",
	suit: "submarine",
	captureCard: "pink-7",
	difficulty: d(3, 3, 3),
	captainMaySelect: yes,
});
push({
	kind: "winWith",
	suit: "submarine",
	captureCard: "green-9",
	difficulty: d(3, 3, 3),
	captainMaySelect: yes,
});

push({
	kind: "noLead",
	suits: ["pink", "yellow", "blue"],
	difficulty: d(4, 3, 3),
	captainMaySelect: yes,
});
push({
	kind: "noLead",
	suits: ["pink", "green"],
	difficulty: d(2, 1, 1),
	captainMaySelect: yes,
});

push({
	kind: "avoid",
	suit: "green",
	difficulty: d(2, 2, 2),
	captainMaySelect: yes,
});
push({
	kind: "avoid",
	suit: "yellow",
	difficulty: d(2, 2, 2),
	captainMaySelect: yes,
});
push({
	kind: "avoid",
	suits: ["pink", "blue"],
	difficulty: d(3, 3, 3),
	captainMaySelect: yes,
});
push({
	kind: "avoid",
	suits: ["yellow", "green"],
	difficulty: d(3, 3, 3),
	captainMaySelect: yes,
});
push({
	kind: "avoid",
	values: [8, 9],
	difficulty: d(3, 3, 2),
	captainMaySelect: yes,
});
push({
	kind: "avoid",
	value: 9,
	difficulty: d(1, 1, 1),
	captainMaySelect: yes,
});
push({
	kind: "avoid",
	value: 5,
	difficulty: d(1, 2, 2),
	captainMaySelect: yes,
});
push({
	kind: "avoid",
	value: 1,
	difficulty: d(2, 2, 2),
	captainMaySelect: yes,
});
push({
	kind: "avoid",
	values: [1, 2, 3],
	difficulty: d(3, 3, 3),
	captainMaySelect: yes,
});

push({
	kind: "skipFirstTricks",
	count: 4,
	difficulty: d(1, 2, 3),
	captainMaySelect: yes,
});
push({
	kind: "skipFirstTricks",
	count: 3,
	difficulty: d(1, 2, 2),
	captainMaySelect: yes,
});
push({
	kind: "skipFirstTricks",
	count: 5,
	difficulty: d(2, 3, 3),
	captainMaySelect: yes,
});
push({
	kind: "trickCount",
	op: "exact",
	count: 0,
	difficulty: d(4, 3, 3),
	captainMaySelect: yes,
});
push({
	kind: "consecutiveTricks",
	count: 2,
	op: "none",
	difficulty: d(3, 2, 2),
	captainMaySelect: yes,
});
push({
	kind: "nthTrick",
	n: 0,
	difficulty: d(2, 3, 3),
	captainMaySelect: yes,
});
push({
	kind: "nthTrick",
	n: 1,
	count: 3,
	difficulty: d(2, 3, 4),
	captainMaySelect: yes,
});
push({
	kind: "nthTrick",
	n: 1,
	count: 2,
	difficulty: d(1, 1, 2),
	captainMaySelect: yes,
});
push({
	kind: "nthTrick",
	n: 1,
	difficulty: d(1, 1, 1),
	captainMaySelect: yes,
});
push({
	kind: "nthTrick",
	n: 1,
	alsoLast: yes,
	difficulty: d(3, 4, 4),
	captainMaySelect: yes,
});
push({
	kind: "nthTrick",
	n: 0,
	only: yes,
	difficulty: d(4, 4, 4),
	captainMaySelect: yes,
});
push({
	kind: "nthTrick",
	n: 1,
	only: yes,
	difficulty: d(4, 3, 3),
	captainMaySelect: yes,
});
push({
	kind: "trickCount",
	op: "exact",
	count: 1,
	difficulty: d(3, 2, 2),
	captainMaySelect: yes,
});
push({
	kind: "trickCount",
	op: "exact",
	count: 2,
	difficulty: d(2, 2, 2),
	captainMaySelect: yes,
});
push({
	kind: "consecutiveTricks",
	count: 2,
	op: "atLeast",
	difficulty: d(1, 1, 1),
	captainMaySelect: yes,
});
push({
	kind: "consecutiveTricks",
	count: 3,
	op: "atLeast",
	difficulty: d(2, 3, 4),
	captainMaySelect: yes,
});
push({
	kind: "trickCount",
	op: "exact",
	count: 4,
	difficulty: d(2, 3, 5),
	captainMaySelect: yes,
});
push({
	kind: "consecutiveTricks",
	count: 3,
	op: "exact",
	difficulty: d(3, 3, 4),
	captainMaySelect: yes,
});
push({
	kind: "consecutiveTricks",
	count: 2,
	op: "exact",
	difficulty: d(3, 3, 3),
	captainMaySelect: yes,
});
push({
	kind: "predictTricks",
	reveal: "open",
	difficulty: d(3, 2, 2),
	captainMaySelect: yes,
});
push({
	kind: "predictTricks",
	reveal: "hidden",
	difficulty: d(4, 3, 3),
	captainMaySelect: yes,
});

push({
	kind: "collectEqualColor",
	a: "pink",
	b: "yellow",
	inTrick: no,
	difficulty: d(4, 4, 4),
	captainMaySelect: yes,
});
push({
	kind: "collectEqualColor",
	a: "green",
	b: "yellow",
	inTrick: yes,
	difficulty: d(2, 3, 3),
	captainMaySelect: yes,
});
push({
	kind: "collectEqualColor",
	a: "pink",
	b: "blue",
	inTrick: yes,
	difficulty: d(2, 3, 3),
	captainMaySelect: yes,
});
push({
	kind: "collectMoreColor",
	more: "yellow",
	less: "blue",
	difficulty: d(1, 1, 1),
	captainMaySelect: yes,
});
push({
	kind: "collectMoreColor",
	more: "pink",
	less: "green",
	difficulty: d(1, 1, 1),
	captainMaySelect: yes,
});

export const TASK_CATALOG: readonly TaskSpec[] = catalog;

export const TASK_BY_ID: Readonly<Record<string, TaskSpec>> = Object.fromEntries(
	TASK_CATALOG.map((spec) => [spec.id, spec]),
);

export function taskCost(spec: TaskSpec, playerCount: 3 | 4 | 5): number {
	return spec.difficulty[playerCount];
}
