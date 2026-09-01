import { CARD_IDS, type CardId, COLOR_SUITS, type Suit, splitCardId } from "@crew/protocol";
import { createFileRoute } from "@tanstack/react-router";
import { type Translate, useI18n } from "../lib/i18n.tsx";
import { CardBack, CardFace } from "../skins/geometry/Card.tsx";

const SUIT_ORDER = [...COLOR_SUITS, "submarine"] as const satisfies readonly Suit[];

const SUIT_LABEL: Record<Suit, string> = {
	pink: "suitPink",
	yellow: "suitYellow",
	green: "suitGreen",
	blue: "suitBlue",
	submarine: "suitSubmarine",
};

const TABLE_STATES: readonly {
	id: string;
	labelKey: string;
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
	{ id: "playable", labelKey: "statePlayable", cardId: "pink-7" },
	{ id: "illegal", labelKey: "stateIllegal", cardId: "pink-7", props: { legal: false } },
	{ id: "selected", labelKey: "stateSelected", cardId: "pink-7", props: { selected: true } },
	{
		id: "communicated",
		labelKey: "stateCommunicated",
		cardId: "pink-7",
		props: { communicated: true },
	},
	{ id: "muted", labelKey: "stateMuted", cardId: "pink-7", props: { muted: true } },
	{ id: "lead", labelKey: "stateLead", cardId: "pink-7", props: { lead: true } },
	{ id: "back", labelKey: "stateBack", back: true },
];

function cardsGroupedBySuit(t: Translate) {
	return SUIT_ORDER.map((suit) => ({
		suit,
		label: t(SUIT_LABEL[suit]),
		lede: suit === "submarine" ? t("suitSubmarineLede") : t("colorSuitLede"),
		cards: CARD_IDS.filter((cardId) => splitCardId(cardId).suit === suit),
	}));
}

export const Route = createFileRoute("/assets/playing-cards")({
	component: PlayingCardsRoute,
});

function PlayingCardsRoute() {
	const { t } = useI18n();
	const groups = cardsGroupedBySuit(t);

	return (
		<section className="@container grid gap-7">
			<header className="grid gap-2 text-center">
				<p className="m-0 text-sm tracking-widest text-muted-foreground uppercase">{t("deck")}</p>
				<h1 className="font-heading m-0 text-[clamp(1.75rem,6vw,2.5rem)] font-semibold tracking-wider uppercase">
					{t("playingCards")}
				</h1>
				<p className="m-0 text-muted-foreground">{t("playingCardsLede")}</p>
				<p className="m-0 text-sm text-muted-foreground">
					{t("cardsAcrossSuits", { cards: CARD_IDS.length, suits: groups.length })}
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
											<span className="block text-[0.68rem] tracking-wide uppercase">
												{t("captain")}
											</span>
										) : null}
									</p>
								</li>
							))}
						</ul>
					</li>
				))}
				<li className="grid gap-3.5">
					<div className="grid gap-1.5 px-0.5">
						<h2 className="m-0 text-lg font-semibold">{t("tableStates")}</h2>
						<p className="m-0 text-sm text-muted-foreground">{t("tableStatesLede")}</p>
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
									{t(state.labelKey)}
								</p>
							</li>
						))}
					</ul>
				</li>
			</ul>
		</section>
	);
}
