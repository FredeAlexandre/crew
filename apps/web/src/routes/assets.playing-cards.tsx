import { CARD_IDS, type CardId, COLOR_SUITS, type Suit, splitCardId } from "@crew/protocol";
import { createFileRoute } from "@tanstack/react-router";
import { CardBack, CardFace } from "../skins/geometry/Card.tsx";

const SUIT_ORDER = [...COLOR_SUITS, "submarine"] as const satisfies readonly Suit[];

const SUIT_COPY: Record<Suit, { label: string; lede: string }> = {
	pink: { label: "Pink", lede: "Color suit. Values 1–9." },
	yellow: { label: "Yellow", lede: "Color suit. Values 1–9." },
	green: { label: "Green", lede: "Color suit. Values 1–9." },
	blue: { label: "Blue", lede: "Color suit. Values 1–9." },
	submarine: {
		label: "Submarine",
		lede: "Trump. Values 1–4. The player holding submarine 4 is captain.",
	},
};

const TABLE_STATES: readonly {
	id: string;
	label: string;
	cardId?: CardId;
	props?: {
		legal?: boolean;
		selected?: boolean;
		communicated?: boolean;
		muted?: boolean;
		lead?: boolean;
	};
	back?: boolean;
}[] = [
	{ id: "playable", label: "Playable", cardId: "pink-7" },
	{ id: "illegal", label: "Illegal", cardId: "pink-7", props: { legal: false } },
	{ id: "selected", label: "Selected", cardId: "pink-7", props: { selected: true } },
	{ id: "communicated", label: "Communicated", cardId: "pink-7", props: { communicated: true } },
	{ id: "muted", label: "Muted", cardId: "pink-7", props: { muted: true } },
	{ id: "lead", label: "Lead", cardId: "pink-7", props: { lead: true } },
	{ id: "back", label: "Back", back: true },
];

function cardsGroupedBySuit() {
	return SUIT_ORDER.map((suit) => ({
		suit,
		label: SUIT_COPY[suit].label,
		lede: SUIT_COPY[suit].lede,
		cards: CARD_IDS.filter((cardId) => splitCardId(cardId).suit === suit),
	}));
}

export const Route = createFileRoute("/assets/playing-cards")({
	component: PlayingCardsRoute,
	head: () => ({
		meta: [{ title: "Playing cards · Crew" }],
	}),
});

function PlayingCardsRoute() {
	const groups = cardsGroupedBySuit();

	return (
		<section className="@container grid gap-7">
			<header className="grid gap-2 text-center">
				<p className="m-0 text-sm tracking-widest text-muted-foreground uppercase">Deck</p>
				<h1 className="font-heading m-0 text-[clamp(1.75rem,6vw,2.5rem)] font-semibold tracking-wider uppercase">
					Playing cards
				</h1>
				<p className="m-0 text-muted-foreground">
					The 40-card deck as it appears in hand and on the trick — four colors and trump.
				</p>
				<p className="m-0 text-sm text-muted-foreground">
					{CARD_IDS.length} cards across {groups.length} suits
				</p>
			</header>

			<ul className="m-0 grid list-none gap-8 p-0">
				{groups.map((group) => (
					<li key={group.suit} className="grid gap-3.5">
						<div className="grid gap-1.5 px-0.5">
							<h2 className="m-0 text-lg font-semibold">{group.label}</h2>
							<p className="m-0 text-sm text-muted-foreground">{group.lede}</p>
						</div>
						<ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(5.25rem,1fr))] gap-x-2.5 gap-y-3.5 p-0">
							{group.cards.map((cardId) => (
								<li
									key={cardId}
									className="grid justify-items-center gap-1.5 [--card-w:100%] [--trick-w:100%]"
								>
									<CardFace cardId={cardId} size="trick" />
									<p className="m-0 text-center text-xs leading-snug tabular-nums text-muted-foreground">
										{cardId}
										{cardId === "submarine-4" ? (
											<span className="block text-[0.68rem] tracking-wide uppercase">Captain</span>
										) : null}
									</p>
								</li>
							))}
						</ul>
					</li>
				))}
				<li className="grid gap-3.5">
					<div className="grid gap-1.5 px-0.5">
						<h2 className="m-0 text-lg font-semibold">Table states</h2>
						<p className="m-0 text-sm text-muted-foreground">
							How one card reads legal, selected, and face down.
						</p>
					</div>
					<ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(5.25rem,1fr))] gap-x-2.5 gap-y-3.5 p-0">
						{TABLE_STATES.map((state) => (
							<li
								key={state.id}
								className="grid justify-items-center gap-1.5 [--card-w:100%] [--trick-w:100%]"
							>
								{state.back ? (
									<CardBack size="trick" />
								) : (
									<CardFace cardId={state.cardId ?? "pink-7"} size="trick" {...state.props} />
								)}
								<p className="m-0 text-center text-xs leading-snug text-muted-foreground">
									{state.label}
								</p>
							</li>
						))}
					</ul>
				</li>
			</ul>
		</section>
	);
}
