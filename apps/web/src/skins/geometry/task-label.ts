import type { TaskPublic } from "@crew/protocol";

export function taskLabel(spec: TaskPublic): string {
	switch (spec.kind) {
		case "winCards":
			return spec.cards.join(" ");
		case "winColor":
			return `${spec.count} ${spec.suit}`;
		case "winValue":
			return `${spec.count}× ${spec.value}`;
		case "winSubmarines":
			return `${spec.count} sub`;
		case "winWith":
			return ["with", spec.card, spec.suit, spec.value].filter(Boolean).join(" ");
		case "avoid":
			return "avoid";
		case "trickCount":
			return spec.op === "exact"
				? `${spec.count} tricks`
				: spec.op === "atLeast"
					? `≥${spec.count} tricks`
					: `≤${spec.count} tricks`;
		case "consecutiveTricks":
			return `${spec.count} in a row`;
		case "nthTrick":
			return spec.n === 0 ? "last trick" : `trick ${spec.n}`;
		case "compareTricks":
			return `${spec.op} ${spec.vs}`;
		case "trickSum":
			return `sum ${spec.op} ${spec.target}`;
		case "trickFilter":
			return spec.filter;
		case "collectAllColors":
			return "all colors";
		case "collectAllOfOneColor":
			return "one color";
		case "collectMoreColor":
			return `${spec.more} > ${spec.less}`;
	}
}
