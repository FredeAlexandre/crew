import { CARD_IDS, type CardId, COLOR_SUITS, type Suit, splitCardId } from "@crew/protocol";
import { createFileRoute } from "@tanstack/react-router";
import { CardBack, CardFace } from "../skins/geometry/Card.tsx";
import styles from "../styles/catalog.module.css";

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
		<section className={styles.page}>
			<header className={styles.masthead}>
				<p className={styles.kicker}>Deck</p>
				<h1 className={styles.title}>Playing cards</h1>
				<p className={styles.lede}>
					The 40-card deck as it appears in hand and on the trick — four colors and trump.
				</p>
				<p className={styles.summary}>
					{CARD_IDS.length} cards across {groups.length} suits
				</p>
			</header>

			<ul className={styles.groups}>
				{groups.map((group) => (
					<li key={group.suit} className={styles.group}>
						<div className={styles.groupHead}>
							<h2 className={styles.groupTitle}>{group.label}</h2>
							<p className={styles.groupLede}>{group.lede}</p>
						</div>
						<ul className={styles.cardGrid}>
							{group.cards.map((cardId) => (
								<li key={cardId} className={styles.cardItem}>
									<CardFace cardId={cardId} size="trick" />
									<p className={styles.cardCaption}>
										{cardId}
										{cardId === "submarine-4" ? (
											<span className={styles.cardNote}>Captain</span>
										) : null}
									</p>
								</li>
							))}
						</ul>
					</li>
				))}
				<li className={styles.group}>
					<div className={styles.groupHead}>
						<h2 className={styles.groupTitle}>Table states</h2>
						<p className={styles.groupLede}>How one card reads legal, selected, and face down.</p>
					</div>
					<ul className={styles.cardGrid}>
						{TABLE_STATES.map((state) => (
							<li key={state.id} className={styles.cardItem}>
								{state.back ? (
									<CardBack size="trick" />
								) : (
									<CardFace cardId={state.cardId ?? "pink-7"} size="trick" {...state.props} />
								)}
								<p className={styles.cardCaption}>{state.label}</p>
							</li>
						))}
					</ul>
				</li>
			</ul>
		</section>
	);
}
