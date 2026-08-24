import type { CardId, DistressDirection, SonarPosition } from "@crew/protocol";
import type { Overlay, TableView } from "@crew/view-model/fixtures";
import { useEffect, useState } from "react";
import { Button } from "react-aria-components";
import type { ClientIntent } from "../../hooks/use-table.ts";
import { CardBack, CardFace } from "./Card.tsx";
import { illegalCopy, opponentSeats, selfSeat, tablePlacement, trickSlot } from "./copy.ts";
import { ChromeLine, HandStrip, SeatPip, SelfDock } from "./parts.tsx";
import styles from "./play.module.css";

const SONAR_POSITION_COPY: Record<SonarPosition, string> = {
	highest: "Highest",
	only: "Only",
	lowest: "Lowest",
};

export function PlayScene({
	view,
	sendIntent,
}: {
	view: TableView;
	sendIntent?: (intent: ClientIntent) => void;
}) {
	const [selected, setSelected] = useState<CardId | null>(null);
	const [sonarOpen, setSonarOpen] = useState(false);
	const [lastTrickOpen, setLastTrickOpen] = useState(false);
	const self = selfSeat(view);
	const overlay: Overlay =
		view.overlay !== "none"
			? view.overlay
			: sonarOpen
				? "sonar"
				: lastTrickOpen && view.lastTrick !== null
					? "lastTrick"
					: "none";
	const selectedCard = view.hand.find((card) => card.cardId === selected);
	const placement = tablePlacement(view);
	const hint = selectedCard && !selectedCard.legal ? illegalCopy(selectedCard.illegalReason) : null;
	const canPlaySelected = Boolean(view.affordances.canPlay && selectedCard?.legal && !sonarOpen);
	const canPassSelected = Boolean(view.affordances.canPassDistressCard && selectedCard?.legal);
	const confirmRail = Boolean(
		(view.affordances.canPlay && !sonarOpen) || view.affordances.canPassDistressCard,
	);
	const sonarIds = new Set(view.sonarCandidates.map((candidate) => candidate.cardId));
	const sonarPositions = view.sonarCandidates
		.filter((candidate) => candidate.cardId === selected)
		.map((candidate) => candidate.position);
	const displayHand = sonarOpen
		? view.hand.map((card) => ({ ...card, legal: sonarIds.has(card.cardId) }))
		: view.hand;
	const canPeek =
		view.affordances.canPeekLastTrick &&
		view.overlay === "none" &&
		!sonarOpen &&
		view.lastTrick !== null;

	useEffect(() => {
		if (view.overlay !== "none") {
			setSonarOpen(false);
			setLastTrickOpen(false);
		}
	}, [view.overlay]);

	useEffect(() => {
		setSonarOpen(false);
		setLastTrickOpen(false);
		setSelected(null);
	}, [view.attemptId]);

	useEffect(() => {
		if (!sonarOpen && !lastTrickOpen) {
			return;
		}
		function onKey(event: KeyboardEvent) {
			if (event.key === "Escape") {
				setSonarOpen(false);
				setLastTrickOpen(false);
			}
		}
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [sonarOpen, lastTrickOpen]);

	function peekLastTrick() {
		if (view.overlay !== "none" || sonarOpen || !view.affordances.canPeekLastTrick) {
			return;
		}
		setLastTrickOpen(true);
	}

	function skipDistress() {
		sendIntent?.({ type: "distress.skip" });
	}

	function activateDistress(direction: DistressDirection) {
		sendIntent?.({ type: "distress.activate", direction });
	}

	function passDistressCard() {
		if (selected === null || !canPassSelected) {
			return;
		}
		sendIntent?.({ type: "distress.passCard", cardId: selected });
		setSelected(null);
	}

	function playCard() {
		if (selected === null || !canPlaySelected) {
			return;
		}
		sendIntent?.({ type: "card.play", cardId: selected });
		setSelected(null);
	}

	function useSonar(position: SonarPosition) {
		if (selected === null) {
			return;
		}
		sendIntent?.({ type: "sonar.use", cardId: selected, position });
		setSonarOpen(false);
	}

	return (
		<div className={styles.table} data-scene={view.scene} data-overlay={overlay}>
			<div className={styles.crew}>
				{opponentSeats(view).map((seat) => (
					<SeatPip
						key={seat.region}
						seat={seat}
						compact
						onPeekLastTrick={canPeek && seat.isLastTrickWinner ? peekLastTrick : undefined}
					/>
				))}
			</div>
			<div className={styles.north}>
				{placement.north.map((seat) => (
					<SeatPip
						key={seat.region}
						seat={seat}
						onPeekLastTrick={canPeek && seat.isLastTrickWinner ? peekLastTrick : undefined}
					/>
				))}
			</div>
			<div className={styles.west}>
				{placement.west.map((seat) => (
					<SeatPip
						key={seat.region}
						seat={seat}
						onPeekLastTrick={canPeek && seat.isLastTrickWinner ? peekLastTrick : undefined}
					/>
				))}
			</div>
			<div className={styles.east}>
				{placement.east.map((seat) => (
					<SeatPip
						key={seat.region}
						seat={seat}
						onPeekLastTrick={canPeek && seat.isLastTrickWinner ? peekLastTrick : undefined}
					/>
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
							sonarPositions={sonarPositions}
							onSkipDistress={
								view.affordances.canSkipDistress && sendIntent ? skipDistress : undefined
							}
							onActivateDistress={
								view.affordances.canActivateDistress && sendIntent ? activateDistress : undefined
							}
							onUseSonar={useSonar}
							onCloseSkin={() => {
								setSonarOpen(false);
								setLastTrickOpen(false);
							}}
						/>
					</div>
				) : null}
			</div>
			{self ? (
				<div className={styles.self}>
					<SelfDock
						seat={self}
						canSonar={view.affordances.canSonar && !sonarOpen}
						canPass={false}
						onSonar={() => {
							setLastTrickOpen(false);
							setSonarOpen(true);
						}}
						onPeekLastTrick={canPeek && self.isLastTrickWinner ? peekLastTrick : undefined}
					/>
				</div>
			) : null}
			<div className={styles.handWrap}>
				{hint && overlay !== "sonar" ? <p className={styles.hint}>{hint}</p> : null}
				<HandStrip
					cards={displayHand}
					selected={selected}
					onSelect={(cardId) => setSelected((current) => (current === cardId ? null : cardId))}
				/>
				{confirmRail ? (
					<div className={styles.handConfirm}>
						{canPassSelected ? (
							<Button className={styles.handAction} onPress={passDistressCard}>
								Pass
							</Button>
						) : null}
						{canPlaySelected ? (
							<Button className={styles.handAction} onPress={playCard}>
								Play
							</Button>
						) : null}
					</div>
				) : null}
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
	onUseSonar,
	onCloseSkin,
}: {
	view: TableView;
	overlay: Overlay;
	sonarPositions: SonarPosition[];
	onSkipDistress?: () => void;
	onActivateDistress?: (direction: DistressDirection) => void;
	onUseSonar: (position: SonarPosition) => void;
	onCloseSkin: () => void;
}) {
	if (overlay === "distress") {
		if (view.affordances.canActivateDistress || view.affordances.canSkipDistress) {
			return (
				<>
					<p className={styles.overlayTitle}>Distress signal</p>
					<p className={styles.overlayCopy}>Pass one color card left or right. Or skip.</p>
					<div className={styles.overlayActions}>
						{onSkipDistress ? (
							<Button className={styles.overlayAction} onPress={onSkipDistress}>
								Skip
							</Button>
						) : null}
						{onActivateDistress ? (
							<>
								<Button className={styles.overlayAction} onPress={() => onActivateDistress("left")}>
									Pass left
								</Button>
								<Button
									className={styles.overlayAction}
									onPress={() => onActivateDistress("right")}
								>
									Pass right
								</Button>
							</>
						) : null}
					</div>
				</>
			);
		}
		if (view.affordances.canPassDistressCard) {
			return (
				<>
					<p className={styles.overlayTitle}>Distress signal</p>
					<p className={styles.overlayCopy}>Pick a color card, then Pass.</p>
				</>
			);
		}
		return (
			<>
				<p className={styles.overlayTitle}>Distress signal</p>
				<p className={styles.overlayCopy}>Waiting for a color card.</p>
			</>
		);
	}
	if (overlay === "sonar") {
		return (
			<>
				<p className={styles.overlayTitle}>Sonar</p>
				<p className={styles.overlayCopy}>Pick a color card, then highest, only, or lowest.</p>
				{sonarPositions.length > 0 ? (
					<div className={styles.overlayActions}>
						{sonarPositions.map((position) => (
							<Button
								key={position}
								className={styles.overlayAction}
								onPress={() => onUseSonar(position)}
							>
								{SONAR_POSITION_COPY[position]}
							</Button>
						))}
					</div>
				) : null}
				<Button className={styles.overlayAction} onPress={onCloseSkin}>
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
				<Button className={styles.overlayAction} onPress={onCloseSkin}>
					Close
				</Button>
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
