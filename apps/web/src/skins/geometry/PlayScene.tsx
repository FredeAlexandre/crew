import type { CardId, DistressDirection, SonarPosition } from "@crew/protocol";
import type { Overlay, TableView, TaskView } from "@crew/view-model/fixtures";
import { useEffect, useState } from "react";
import { Button } from "react-aria-components";
import type { ClientIntent } from "../../hooks/use-table.ts";
import { CardBack, CardFace } from "./Card.tsx";
import { illegalCopy, lobbySlot, trickSlot, turnCopy } from "./copy.ts";
import { ChromeLine, HandStrip, PlaySeat, SonarDetailBody, TaskCard } from "./parts.tsx";
import styles from "./play.module.css";
import sceneStyles from "./scenes.module.css";

const SONAR_POSITION_COPY: Record<SonarPosition, string> = {
	highest: "Highest",
	only: "Only",
	lowest: "Lowest",
};

type QueuedSonar = { cardId: CardId; position: SonarPosition };

export function PlayScene({
	view,
	sendIntent,
}: {
	view: TableView;
	sendIntent?: (intent: ClientIntent) => void;
}) {
	const [selected, setSelected] = useState<CardId | null>(null);
	const [sonarOpen, setSonarOpen] = useState(false);
	const [queuedSonar, setQueuedSonar] = useState<QueuedSonar | null>(null);
	const [lastTrickOpen, setLastTrickOpen] = useState(false);
	const [sonarDetailRegion, setSonarDetailRegion] = useState<
		TableView["seats"][number]["region"] | null
	>(null);
	const overlay: Overlay =
		view.overlay !== "none"
			? view.overlay
			: sonarOpen
				? "sonar"
				: lastTrickOpen && view.lastTrick !== null
					? "lastTrick"
					: sonarDetailRegion !== null
						? "reminder"
						: "none";
	const selectedCard = view.hand.find((card) => card.cardId === selected);
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
	const sonarEnabled =
		view.scene === "play" &&
		view.overlay === "none" &&
		view.chrome.sonarAvailable &&
		!view.chrome.flags.sonarDisabled;
	const shownSeats = withQueuedSonar(view.seats, queuedSonar);
	const shownHand = withQueuedHand(view.hand, queuedSonar);
	const displayHand = sonarOpen
		? shownHand.map((card) => ({ ...card, legal: sonarIds.has(card.cardId) }))
		: shownHand;
	const sonarDetailSeat =
		sonarDetailRegion === null
			? null
			: (shownSeats.find((seat) => seat.region === sonarDetailRegion) ?? null);
	const canPeek =
		view.scene === "play" &&
		view.affordances.canPeekLastTrick &&
		view.overlay === "none" &&
		!sonarOpen &&
		view.lastTrick !== null;
	const isDraft = view.scene === "taskDraft";
	const quietHand = isDraft || view.scene === "deal";
	const turn = isDraft ? turnCopy(view) : null;

	useEffect(() => {
		if (view.overlay !== "none") {
			setSonarOpen(false);
			setLastTrickOpen(false);
			setSonarDetailRegion(null);
		}
	}, [view.overlay]);

	useEffect(() => {
		setSonarOpen(false);
		setLastTrickOpen(false);
		setSonarDetailRegion(null);
		setSelected(null);
		setQueuedSonar(null);
	}, [view.attemptId]);

	useEffect(() => {
		if (queuedSonar === null) {
			return;
		}
		const self = view.seats.find((seat) => seat.region === "seat.self");
		if (self?.sonar.communication !== null && self?.sonar.communication !== undefined) {
			setQueuedSonar(null);
			return;
		}
		const match = view.sonarCandidates.find((candidate) => candidate.cardId === queuedSonar.cardId);
		if (match === undefined) {
			setQueuedSonar(null);
			return;
		}
		if (match.position !== queuedSonar.position) {
			setQueuedSonar({ cardId: queuedSonar.cardId, position: match.position });
			return;
		}
		if (!view.affordances.canSonar || sendIntent === undefined) {
			return;
		}
		sendIntent({ type: "sonar.use", cardId: match.cardId, position: match.position });
		setQueuedSonar(null);
		setSonarOpen(false);
	}, [queuedSonar, sendIntent, view]);

	useEffect(() => {
		if (!sonarOpen && !lastTrickOpen && sonarDetailRegion === null) {
			return;
		}
		function onKey(event: KeyboardEvent) {
			if (event.key === "Escape") {
				setSonarOpen(false);
				setLastTrickOpen(false);
				setSonarDetailRegion(null);
			}
		}
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [sonarOpen, lastTrickOpen, sonarDetailRegion]);

	function peekLastTrick() {
		if (view.overlay !== "none" || sonarOpen || !view.affordances.canPeekLastTrick) {
			return;
		}
		setSonarDetailRegion(null);
		setLastTrickOpen(true);
	}

	function openSonarDetail(region: TableView["seats"][number]["region"]) {
		setSonarOpen(false);
		setLastTrickOpen(false);
		setSonarDetailRegion(region);
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

	function passTask() {
		sendIntent?.({ type: "task.pass" });
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
		if (view.affordances.canSonar) {
			sendIntent?.({ type: "sonar.use", cardId: selected, position });
			setQueuedSonar(null);
		} else {
			setQueuedSonar({ cardId: selected, position });
		}
		setSonarOpen(false);
	}

	function cancelQueuedSonar() {
		setQueuedSonar(null);
		setSonarOpen(false);
	}

	function closeSkinOverlay() {
		setSonarOpen(false);
		setLastTrickOpen(false);
		setSonarDetailRegion(null);
	}

	return (
		<div className={styles.table} data-scene={view.scene} data-overlay={overlay}>
			{overlay !== "none" ? (
				<div className={styles.overlayLayer} data-region="overlay">
					<div className={styles.overlay}>
						<OverlayBody
							view={view}
							overlay={overlay}
							sonarDetailSeat={sonarDetailSeat}
							sonarPositions={sonarPositions}
							queued={!view.affordances.canSonar}
							onSkipDistress={
								view.affordances.canSkipDistress && sendIntent ? skipDistress : undefined
							}
							onActivateDistress={
								view.affordances.canActivateDistress && sendIntent ? activateDistress : undefined
							}
							onUseSonar={useSonar}
							onCancelQueue={queuedSonar !== null ? cancelQueuedSonar : undefined}
							onCloseSkin={closeSkinOverlay}
						/>
					</div>
				</div>
			) : null}
			<div
				className={`${sceneStyles.ring} ${styles.playRing}`}
				data-count={String(view.playerCount)}
			>
				{shownSeats.map((seat) => {
					const isSelf = seat.region === "seat.self";
					return (
						<PlaySeat
							key={seat.region}
							seat={seat}
							slot={lobbySlot(seat.region, view.playerCount)}
							chairClassName={`${sceneStyles.chair} ${styles.playChair}`}
							onPeekLastTrick={canPeek && seat.isLastTrickWinner ? peekLastTrick : undefined}
							onSonarDetail={() => openSonarDetail(seat.region)}
							canSonar={isSelf && sonarEnabled && !sonarOpen}
							canPass={isSelf && isDraft && view.affordances.canPassTask}
							onSonar={
								isSelf
									? () => {
											setLastTrickOpen(false);
											setSonarDetailRegion(null);
											if (queuedSonar !== null) {
												setSelected(queuedSonar.cardId);
											}
											setSonarOpen(true);
										}
									: undefined
							}
							onPass={isSelf && isDraft ? passTask : undefined}
						/>
					);
				})}
				<div className={`${sceneStyles.lobbyWell} ${styles.playWell}`}>
					<ChromeLine view={view} />
					<Well
						view={view}
						turn={turn}
						onTake={
							sendIntent
								? (task: TaskView) =>
										sendIntent({ type: "task.take", taskInstanceId: task.instanceId })
								: undefined
						}
					/>
				</div>
			</div>
			<div className={styles.handWrap}>
				{hint && overlay !== "sonar" ? <p className={styles.hint}>{hint}</p> : null}
				<HandStrip
					cards={displayHand}
					selected={selected}
					quiet={quietHand}
					onSelect={setSelected}
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

function Well({
	view,
	turn,
	onTake,
}: {
	view: TableView;
	turn: string | null;
	onTake?: (task: TaskView) => void;
}) {
	if (view.scene === "taskDraft") {
		return (
			<div className={styles.draftWell} data-region="tasks.center">
				{turn ? <p className={styles.draftPrompt}>{turn}. Take a task.</p> : null}
				<div className={styles.taskRow}>
					{view.centerTasks.map((task) => (
						<TaskCard key={task.instanceId} task={task} onTake={onTake} />
					))}
				</div>
			</div>
		);
	}
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
	sonarDetailSeat,
	sonarPositions,
	queued = false,
	onSkipDistress,
	onActivateDistress,
	onUseSonar,
	onCancelQueue,
	onCloseSkin,
}: {
	view: TableView;
	overlay: Overlay;
	sonarDetailSeat: TableView["seats"][number] | null;
	sonarPositions: SonarPosition[];
	queued?: boolean;
	onSkipDistress?: () => void;
	onActivateDistress?: (direction: DistressDirection) => void;
	onUseSonar: (position: SonarPosition) => void;
	onCancelQueue?: () => void;
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
				<p className={styles.overlayCopy}>
					{queued
						? "Pick a color card, then highest, only, or lowest. The crew sees it after this trick. You can change it until then."
						: "Pick a color card, then highest, only, or lowest."}
				</p>
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
				{onCancelQueue ? (
					<Button className={styles.overlayAction} onPress={onCancelQueue}>
						Cancel queue
					</Button>
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
	if (sonarDetailSeat) {
		return (
			<>
				<SonarDetailBody seat={sonarDetailSeat} />
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

function withQueuedSonar(
	seats: TableView["seats"],
	queued: QueuedSonar | null,
): TableView["seats"] {
	if (queued === null) {
		return seats;
	}
	return seats.map((seat) => {
		if (seat.region !== "seat.self" || seat.sonar.communication !== null) {
			return seat;
		}
		return {
			...seat,
			sonar: { state: "communicating", communication: queued },
		};
	});
}

function withQueuedHand(hand: TableView["hand"], queued: QueuedSonar | null): TableView["hand"] {
	if (queued === null) {
		return hand;
	}
	return hand.map((card) =>
		card.cardId === queued.cardId ? { ...card, communicated: true } : card,
	);
}
