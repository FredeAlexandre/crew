import { TASK_CATALOG } from "@crew/engine";
import type { TaskPublic } from "@crew/protocol";

export type TaskKind = TaskPublic["kind"];

export const TASK_KIND_ORDER = [
	"winCards",
	"winColor",
	"winValue",
	"winSubmarines",
	"winWith",
	"avoid",
	"trickCount",
	"consecutiveTricks",
	"nthTrick",
	"compareTricks",
	"trickSum",
	"trickFilter",
	"collectAllColors",
	"collectAllOfOneColor",
	"collectMoreColor",
] as const satisfies readonly TaskKind[];

export const TASK_KIND_LABELS: Record<TaskKind, string> = {
	winCards: "Win specific cards",
	winColor: "Win tricks of a color",
	winValue: "Win tricks with a value",
	winSubmarines: "Win submarine tricks",
	winWith: "Win with a card",
	avoid: "Avoid winning",
	trickCount: "Trick count",
	consecutiveTricks: "Consecutive tricks",
	nthTrick: "Specific trick",
	compareTricks: "Compare trick counts",
	trickSum: "Trick sum",
	trickFilter: "Trick filter",
	collectAllColors: "Collect all colors",
	collectAllOfOneColor: "Collect one color",
	collectMoreColor: "Collect more of one color",
};

export const TASK_KIND_LEDE: Record<TaskKind, string> = {
	winCards: "Capture particular cards in tricks you win.",
	winColor: "Win a number of tricks that contain a given color.",
	winValue: "Win tricks where a given value is played.",
	winSubmarines: "Win tricks that include one or more submarines.",
	winWith: "Win a trick by playing a specific card, color, or value.",
	avoid: "Do not win tricks matching the forbidden pattern.",
	trickCount: "Finish the mission with an exact, minimum, or maximum trick count.",
	consecutiveTricks: "Win several tricks in a row.",
	nthTrick: "Win a particular trick in the mission.",
	compareTricks: "End with more, fewer, or the same number of tricks as someone else.",
	trickSum: "Win a trick whose cards add up to a target sum.",
	trickFilter: "Win a trick where every card matches a filter.",
	collectAllColors: "Win at least one card of every color.",
	collectAllOfOneColor: "Win every card of a single color.",
	collectMoreColor: "Win more cards of one color than another.",
};

export const TASK_CATALOG_PUBLIC: readonly TaskPublic[] = TASK_CATALOG;

export function tasksGroupedByKind(): readonly {
	readonly kind: TaskKind;
	readonly label: string;
	readonly lede: string;
	readonly tasks: readonly TaskPublic[];
}[] {
	return TASK_KIND_ORDER.map((kind) => ({
		kind,
		label: TASK_KIND_LABELS[kind],
		lede: TASK_KIND_LEDE[kind],
		tasks: TASK_CATALOG.filter((task) => task.kind === kind),
	})).filter((group) => group.tasks.length > 0);
}
