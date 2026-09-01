import { TASK_CATALOG } from "@crew/engine";
import type { TaskPublic } from "@crew/protocol";

export type TaskKind = TaskPublic["kind"];

export const TASK_KIND_ORDER = [
	"winCards",
	"winColor",
	"winColors",
	"winValue",
	"winSubmarines",
	"winWith",
	"avoid",
	"noLead",
	"trickCount",
	"predictTricks",
	"consecutiveTricks",
	"nthTrick",
	"skipFirstTricks",
	"compareTricks",
	"trickSum",
	"trickFilter",
	"collectAllColors",
	"collectAllOfOneColor",
	"collectMoreColor",
	"collectEqualColor",
] as const satisfies readonly TaskKind[];

export const TASK_KIND_LABELS: Record<TaskKind, string> = {
	winCards: "Win specific cards",
	winColor: "Win cards of a color",
	winColors: "Win exact colors",
	winValue: "Win cards of a value",
	winSubmarines: "Win submarines",
	winWith: "Win with a card",
	avoid: "Avoid winning",
	noLead: "Do not lead",
	trickCount: "Trick count",
	predictTricks: "Predict tricks",
	consecutiveTricks: "Consecutive tricks",
	nthTrick: "Specific trick",
	skipFirstTricks: "Skip early tricks",
	compareTricks: "Compare trick counts",
	trickSum: "Trick sum",
	trickFilter: "Trick filter",
	collectAllColors: "Collect all colors",
	collectAllOfOneColor: "Collect one color",
	collectMoreColor: "Collect more of one color",
	collectEqualColor: "Equal colors",
};

export const TASK_KIND_LEDE: Record<TaskKind, string> = {
	winCards: "Capture particular cards in tricks you win.",
	winColor: "Win a number of cards of a given color.",
	winColors: "Win exact counts of more than one color.",
	winValue: "Win a number of color cards of a given rank.",
	winSubmarines: "Win a number of submarine cards.",
	winWith: "Win a trick by playing a specific card, and sometimes capture another in that trick.",
	avoid: "Do not capture matching cards.",
	noLead: "Do not open a trick with the listed colors.",
	trickCount: "Finish the mission with an exact trick count.",
	predictTricks: "Name how many tricks you will win, then hit that number.",
	consecutiveTricks: "Win several tricks in a row, or avoid doing so.",
	nthTrick: "Win particular tricks in the mission.",
	skipFirstTricks: "Win none of the first tricks.",
	compareTricks: "End with more, fewer, or the same number of tricks as someone else.",
	trickSum: "Win a trick whose cards add up to a target sum.",
	trickFilter: "Win a trick where every color card matches a filter.",
	collectAllColors: "Win at least one card of every color.",
	collectAllOfOneColor: "Win every card of a single color.",
	collectMoreColor: "Win more cards of one color than another.",
	collectEqualColor: "Win the same number of two colors, overall or in one trick.",
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
