import type { CardId } from "@crew/protocol";
import type { Overlay, TableView } from "@crew/view-model/fixtures";
import { useState } from "react";
import { Button } from "react-aria-components";
import { CardBack, CardFace } from "./Card.tsx";
import { illegalCopy, opponentSeats, selfSeat, tablePlacement, trickSlot } from "./copy.ts";
import { ChromeLine, HandStrip, SeatPip, SelfDock } from "./parts.tsx";
import styles from "./play.module.css";

export function PlayScene({
	view,
	onSkipDistress,
	onActivateDistress,
}: {
	view: TableView;
	onSkipDistress?: () => void;
	onActivateDistress?: () => void;
}) {
	const [selected, setSelected] = useState<CardId | null>(null);
	const [sonarOpen, setSonarOpen] = useState(false);
	const self = selfSeat(view);
	const overlay: Overlay = view.overlay !== "none" ? view.overlay : sonarOpen ? "sonar" : "none";
	const selectedCard = view.hand.find((card) => card.cardId === selected);
	const placement = tablePlacement(view);
	const hint = selectedCard && !selectedCard.legal ? illegalCopy(selectedCard.illegalReason) : null;
	const canPlaySelected = Boolean(view.affordances.canPlay && selectedCard?.legal);
	const sonarPositions = view.sonarCandidates.filter((candidate) => candidate.cardId === selected);

	return (
		<div className={styles.table} data-scene={view.scene} data-overlay={overlay}>
			<div className={styles.crew}>
				{opponentSeats(view).map((seat) => (
					<SeatPip key={seat.region} seat={seat} compact />
				))}
			</div>
			<div className={styles.north}>
				{placement.north.map((seat) => (
					<SeatPip key={seat.region} seat={seat} />
				))}
			</div>
			<div className={styles.west}>
				{placement.west.map((seat) => (
					<SeatPip key={seat.region} seat={seat} />
				))}
			</div>
			<div className={styles.east}>
				{placement.east.map((seat) => (
					<SeatPip key={seat.region} seat={seat} />
				))}
			</div>
			<div className={styles.well}>
				<ChromeLine view={view} />
				<Well view={view} />
				{overlay !== "none" ? (
					<div className={styles.overlay} data-region="overlay">
						<OverlayBody
							view={view}
							overlay={overlay}
							sonarPositions={sonarPositions.map((candidate) => candidate.position)}
							onSkipDistress={onSkipDistress}
							onActivateDistress={onActivateDistress}
							onCloseSonar={() => setSonarOpen(false)}
						/>
					</div>
				) : null}
			</div>
			{self ? (
				<div className={styles.self}>
					<SelfDock
						seat={self}
						canSonar={view.affordances.canSonar}
						canPlay={canPlaySelected}
						canPass={false}
						onSonar={() => setSonarOpen(true)}
						onPlay={() => setSelected(null)}
					/>
				</div>
			) : null}
			<div className={styles.handWrap}>
				{hint ? <p className={styles.hint}>{hint}</p> : null}
				<HandStrip
					cards={view.hand}
					selected={selected}
					onSelect={(cardId) => setSelected((current) => (current === cardId ? null : cardId))}
				/>
			</div>
		</div>
	);
}

function Well({ view }: { view: TableView }) {
	if (view.scene === "deal") {
		return (
			<div className={styles.stock} data-region="trick">
				<span className={styles.stockPile}>
					<CardBack />
					<CardBack />
					<CardBack />
				</span>
				<p className={styles.stockLabel}>Dealing</p>
			</div>
		);
	}
	if (view.undealt.present && view.trick.cards.length === 0) {
		return (
			<div className={styles.stock} data-region="undealt">
				<CardBack size="token" />
			</div>
		);
	}
	return (
		<div className={styles.trick} data-region="trick">
			{(["top", "left", "right", "bottom"] as const).map((slot) => {
				const cards = view.trick.cards.filter(
					(card) => trickSlot(card.region, view.playerCount) === slot,
				);
				return (
					<div key={slot} className={styles.slot} data-slot={slot}>
						{cards.map((card) => (
							<CardFace
								key={`${card.seatId}-${card.order}`}
								cardId={card.cardId}
								size="trick"
								lead={view.trick.leadRegion === card.region}
							/>
						))}
					</div>
				);
			})}
		</div>
	);
}

function OverlayBody({
	view,
	overlay,
	sonarPositions,
	onSkipDistress,
	onActivateDistress,
	onCloseSonar,
}: {
	view: TableView;
	overlay: Overlay;
	sonarPositions: string[];
	onSkipDistress?: () => void;
	onActivateDistress?: () => void;
	onCloseSonar: () => void;
}) {
	if (overlay === "distress") {
		return (
			<>
				<p className={styles.overlayTitle}>Distress signal</p>
				<p className={styles.overlayCopy}>Pass one color card left or right. Or skip.</p>
				<div className={styles.overlayActions}>
					{onActivateDistress ? (
						<Button className={styles.overlayAction} onPress={onActivateDistress}>
							Activate
						</Button>
					) : null}
					{onSkipDistress ? (
						<Button className={styles.overlayAction} onPress={onSkipDistress}>
							Skip
						</Button>
					) : null}
				</div>
			</>
		);
	}
	if (overlay === "sonar") {
		return (
			<>
				<p className={styles.overlayTitle}>Sonar</p>
				<p className={styles.overlayCopy}>Pick a color card, then highest, only, or lowest.</p>
				{sonarPositions.length > 0 ? (
					<p className={styles.overlayCopy}>{sonarPositions.join(" · ")}</p>
				) : null}
				<Button className={styles.overlayAction} onPress={onCloseSonar}>
					Close
				</Button>
			</>
		);
	}
	if (overlay === "lastTrick" && view.lastTrick) {
		return (
			<>
				<p className={styles.overlayTitle}>Last trick</p>
				<div className={styles.lastTrick}>
					{view.lastTrick.cards.map((card) => (
						<CardFace key={`${card.seatId}-${card.order}`} cardId={card.cardId} size="token" />
					))}
				</div>
			</>
		);
	}
	return (
		<>
			<p className={styles.overlayTitle}>Reminder</p>
			<p className={styles.overlayCopy}>Follow suit. Submarine is trump. Sonar once.</p>
		</>
	);
}
