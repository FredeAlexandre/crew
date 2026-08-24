import type { CardId, DistressDirection, SonarPosition } from "@crew/protocol";
import type { Overlay, TableView, TaskView } from "@crew/view-model/fixtures";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Button } from "react-aria-components";
import type { ClientIntent } from "../../hooks/use-table.ts";
import { useI18n } from "../../lib/i18n.tsx";
import { playCue } from "../../lib/sfx.ts";
import { trickCardKey, trickJuice } from "../../lib/trick-juice.ts";
import { CardBack, CardFace } from "./Card.tsx";
import { illegalCopy, lobbySlot, trickSlot, turnCopy } from "./copy.ts";
import { sortHand } from "./hand-sort.ts";
import { ChromeLine, HandStrip, PlaySeat, SonarDetailBody, TaskCard } from "./parts.tsx";
import styles from "./play.module.css";
import sceneStyles from "./scenes.module.css";
import { TaskCatalogCard } from "./TaskCatalogCard.tsx";

type QueuedSonar = { cardId: CardId; position: SonarPosition };
type TrickTransition = { remaining: number; paused: boolean };

const TRICK_TRANSITION_MS = 2_000;

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
	const [showCompletedTricks, setShowCompletedTricks] = useState(false);
	const [sonarDetailRegion, setSonarDetailRegion] = useState<
		TableView["seats"][number]["region"] | null
	>(null);
	const [inspectedTask, setInspectedTask] = useState<TaskView | null>(null);
	const prevView = useRef<TableView | null>(null);
	const [landKeys, setLandKeys] = useState<string[]>([]);
	const [heldCards, setHeldCards] = useState<TableView["trick"]["cards"] | null>(null);
	const [winnerRegion, setWinnerRegion] = useState<
		TableView["trick"]["cards"][number]["region"] | null
	>(null);
	const [trickTransition, setTrickTransition] = useState<TrickTransition | null>(null);
	const [nudged, setNudged] = useState<CardId | null>(null);
	const overlay: Overlay =
		view.overlay !== "none"
			? view.overlay
			: sonarOpen
				? "sonar"
				: lastTrickOpen && view.lastTrick !== null
					? "lastTrick"
					: sonarDetailRegion !== null || inspectedTask !== null
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
	const displayHand = sortHand(
		sonarOpen
			? shownHand.map((card) => ({ ...card, legal: sonarIds.has(card.cardId) }))
			: shownHand,
	);
	const sonarDetailSeat =
		sonarDetailRegion === null
			? null
			: (shownSeats.find((seat) => seat.region === sonarDetailRegion) ?? null);
	const canPeek =
		view.scene === "play" &&
		view.affordances.canPeekLastTrick &&
		view.overlay === "none" &&
		!sonarOpen &&
		showCompletedTricks &&
		view.lastTrick !== null;
	const isDraft = view.scene === "taskDraft";
	const quietHand = isDraft || view.scene === "deal";
	const turn = isDraft ? turnCopy(view) : null;
	const shownTrickCards = showCompletedTricks ? (heldCards ?? view.trick.cards) : view.trick.cards;
	const shownLeadRegion =
		!showCompletedTricks || heldCards === null
			? view.trick.leadRegion
			: (heldCards.find((card) => card.order === 1)?.region ?? null);
	const landKeySet = new Set(showCompletedTricks && heldCards !== null ? [] : landKeys);

	useEffect(() => {
		if (view.overlay !== "none") {
			setSonarOpen(false);
			setLastTrickOpen(false);
			setSonarDetailRegion(null);
			setInspectedTask(null);
		}
	}, [view.overlay]);

	useEffect(() => {
		setSonarOpen(false);
		setLastTrickOpen(false);
		setShowCompletedTricks(false);
		setSonarDetailRegion(null);
		setInspectedTask(null);
		setSelected(null);
		setQueuedSonar(null);
		setHeldCards(null);
		setWinnerRegion(null);
		setTrickTransition(null);
	}, [view.attemptId]);

	useLayoutEffect(() => {
		const prev = prevView.current;
		prevView.current = view;
		const juice = trickJuice(prev, view);
		if (juice.landKeys.length > 0) {
			setLandKeys(juice.landKeys);
		}
		if (juice.playWin) {
			playCue("win", `win:${view.attemptId ?? "none"}:${view.lastTrick?.trickId ?? "x"}`);
		}
		if (showCompletedTricks && juice.holdCards && heldCards === null) {
			setHeldCards(juice.holdCards);
			setWinnerRegion(juice.winnerRegion);
			setTrickTransition({ remaining: TRICK_TRANSITION_MS, paused: false });
		} else if (view.trick.cards.length > 0 && heldCards === null) {
			setHeldCards(null);
			setWinnerRegion(null);
			setTrickTransition(null);
		}
	}, [showCompletedTricks, view]);

	useEffect(() => {
		if (landKeys.length === 0) {
			return;
		}
		const timer = window.setTimeout(() => setLandKeys([]), 220);
		return () => window.clearTimeout(timer);
	}, [landKeys]);

	useEffect(() => {
		if (heldCards === null || trickTransition === null || trickTransition.paused) {
			return;
		}
		const startedAt = performance.now();
		const startingRemaining = trickTransition.remaining;
		let frame = 0;
		function tick(now: number) {
			const remaining = Math.max(0, startingRemaining - (now - startedAt));
			if (remaining === 0) {
				setHeldCards(null);
				setWinnerRegion(null);
				setTrickTransition(null);
				return;
			}
			setTrickTransition((current) => {
				if (current === null || current.paused) {
					return current;
				}
				return { ...current, remaining };
			});
			frame = window.requestAnimationFrame(tick);
		}
		frame = window.requestAnimationFrame(tick);
		return () => window.cancelAnimationFrame(frame);
	}, [heldCards, trickTransition]);

	function toggleTrickTransition() {
		if (trickTransition === null) {
			return;
		}
		if (trickTransition.paused) {
			setHeldCards(null);
			setWinnerRegion(null);
			setTrickTransition(null);
			return;
		}
		setTrickTransition((current) => (current ? { ...current, paused: true } : null));
	}

	function toggleCompletedTricks() {
		setShowCompletedTricks((shown) => {
			if (shown) {
				setLastTrickOpen(false);
				setHeldCards(null);
				setWinnerRegion(null);
				setTrickTransition(null);
			}
			return !shown;
		});
	}

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
		if (!sonarOpen && !lastTrickOpen && sonarDetailRegion === null && inspectedTask === null) {
			return;
		}
		function onKey(event: KeyboardEvent) {
			if (event.key === "Escape") {
				setSonarOpen(false);
				setLastTrickOpen(false);
				setSonarDetailRegion(null);
				setInspectedTask(null);
			}
		}
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [sonarOpen, lastTrickOpen, sonarDetailRegion, inspectedTask]);

	function peekLastTrick() {
		if (
			view.overlay !== "none" ||
			sonarOpen ||
			!showCompletedTricks ||
			!view.affordances.canPeekLastTrick
		) {
			return;
		}
		setSonarDetailRegion(null);
		setInspectedTask(null);
		setLastTrickOpen(true);
	}

	function openSonarDetail(region: TableView["seats"][number]["region"]) {
		setSonarOpen(false);
		setLastTrickOpen(false);
		setInspectedTask(null);
		setSonarDetailRegion(region);
	}

	function inspectTask(task: TaskView) {
		setSonarOpen(false);
		setLastTrickOpen(false);
		setSonarDetailRegion(null);
		setInspectedTask(task);
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

	function nudgeIllegal(cardId: CardId) {
		setNudged(null);
		window.requestAnimationFrame(() => {
			setNudged(cardId);
			playCue("tick");
		});
	}

	function activateCard(cardId: CardId) {
		if (quietHand || sonarOpen) {
			return;
		}
		const card = displayHand.find((entry) => entry.cardId === cardId);
		if (card === undefined) {
			return;
		}
		if (!card.legal) {
			nudgeIllegal(cardId);
			return;
		}
		if (view.affordances.canPlay) {
			playCue("place");
			sendIntent?.({ type: "card.play", cardId });
			setSelected(null);
		}
	}

	function playCard() {
		if (selected === null || !canPlaySelected) {
			return;
		}
		playCue("place");
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
		setInspectedTask(null);
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
							inspectedTask={inspectedTask}
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
							showCompletedTricks={showCompletedTricks}
							onSonarDetail={() => openSonarDetail(seat.region)}
							onInspectTask={inspectTask}
							canSonar={isSelf && sonarEnabled && !sonarOpen}
							canPass={isSelf && isDraft && view.affordances.canPassTask}
							onSonar={
								isSelf
									? () => {
											setLastTrickOpen(false);
											setSonarDetailRegion(null);
											setInspectedTask(null);
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
					<ChromeLine
						view={view}
						showCompletedTricks={showCompletedTricks}
						onToggleCompletedTricks={toggleCompletedTricks}
					/>
					<Well
						view={view}
						turn={turn}
						trickCards={shownTrickCards}
						leadRegion={shownLeadRegion}
						landKeys={landKeySet}
						winnerRegion={showCompletedTricks && heldCards !== null ? winnerRegion : null}
						trickTransition={showCompletedTricks && heldCards !== null ? trickTransition : null}
						onToggleTrickTransition={toggleTrickTransition}
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
					nudged={nudged}
					onSelect={setSelected}
					onActivate={quietHand ? undefined : activateCard}
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
	trickCards,
	leadRegion,
	landKeys,
	winnerRegion,
	trickTransition,
	onToggleTrickTransition,
	onTake,
}: {
	view: TableView;
	turn: string | null;
	trickCards: TableView["trick"]["cards"];
	leadRegion: TableView["trick"]["leadRegion"];
	landKeys: ReadonlySet<string>;
	winnerRegion: TableView["trick"]["cards"][number]["region"] | null;
	trickTransition: TrickTransition | null;
	onToggleTrickTransition: () => void;
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
	if (view.undealt.present && trickCards.length === 0) {
		return (
			<div className={styles.stock} data-region="undealt">
				<CardBack size="token" />
			</div>
		);
	}
	return (
		<div className={styles.trickStage}>
			<div className={styles.trick} data-region="trick">
				{(["top", "left", "right", "bottom"] as const).map((slot) => {
					const cards = trickCards.filter(
						(card) => trickSlot(card.region, view.playerCount) === slot,
					);
					return (
						<div key={slot} className={styles.slot} data-slot={slot}>
							{cards.map((card) => (
								<div
									key={`${card.seatId}-${card.order}`}
									className={styles.trickCard}
									data-land={landKeys.has(trickCardKey(card)) ? "true" : "false"}
									data-win={winnerRegion === card.region ? "true" : "false"}
								>
									<CardFace cardId={card.cardId} size="trick" lead={leadRegion === card.region} />
								</div>
							))}
						</div>
					);
				})}
			</div>
			{trickTransition ? (
				<TrickTransitionControl transition={trickTransition} onToggle={onToggleTrickTransition} />
			) : null}
		</div>
	);
}

function TrickTransitionControl({
	transition,
	onToggle,
}: {
	transition: TrickTransition;
	onToggle: () => void;
}) {
	const percent = Math.round((transition.remaining / TRICK_TRANSITION_MS) * 100);
	return (
		<div className={styles.trickTransition}>
			<div
				className={styles.trickProgress}
				role="progressbar"
				aria-label="Time until the next trick"
				aria-valuemin={0}
				aria-valuemax={100}
				aria-valuenow={percent}
			>
				<span style={{ transform: `scaleX(${percent / 100})` }} />
			</div>
			<Button className={styles.trickTransitionAction} onPress={onToggle}>
				{transition.paused ? "Start next trick" : "Keep trick visible"}
			</Button>
		</div>
	);
}

function OverlayBody({
	view,
	overlay,
	sonarDetailSeat,
	inspectedTask,
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
	inspectedTask: TaskView | null;
	sonarPositions: SonarPosition[];
	queued?: boolean;
	onSkipDistress?: () => void;
	onActivateDistress?: (direction: DistressDirection) => void;
	onUseSonar: (position: SonarPosition) => void;
	onCancelQueue?: () => void;
	onCloseSkin: () => void;
}) {
	const { t } = useI18n();
	if (overlay === "distress") {
		if (view.affordances.canActivateDistress || view.affordances.canSkipDistress) {
			return (
				<>
					<p className={styles.overlayTitle}>{t("distressSignal")}</p>
					<p className={styles.overlayCopy}>{t("passColorCard")}</p>
					<div className={styles.overlayActions}>
						{onSkipDistress ? (
							<Button className={styles.overlayAction} onPress={onSkipDistress}>
								{t("skip")}
							</Button>
						) : null}
						{onActivateDistress ? (
							<>
								<Button className={styles.overlayAction} onPress={() => onActivateDistress("left")}>
									{t("passRight")}
								</Button>
								<Button
									className={styles.overlayAction}
									onPress={() => onActivateDistress("right")}
								>
									{t("passLeft")}
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
					<p className={styles.overlayTitle}>{t("distressSignal")}</p>
					<p className={styles.overlayCopy}>{t("pickColorPass")}</p>
				</>
			);
		}
		return (
			<>
				<p className={styles.overlayTitle}>{t("distressSignal")}</p>
				<p className={styles.overlayCopy}>{t("waitingColorCard")}</p>
			</>
		);
	}
	if (overlay === "sonar") {
		return (
			<>
				<p className={styles.overlayTitle}>{t("sonar")}</p>
				<p className={styles.overlayCopy}>{queued ? t("sonarQueued") : t("sonarPick")}</p>
				{sonarPositions.length > 0 ? (
					<div className={styles.overlayActions}>
						{sonarPositions.map((position) => (
							<Button
								key={position}
								className={styles.overlayAction}
								onPress={() => onUseSonar(position)}
							>
								{t(position)}
							</Button>
						))}
					</div>
				) : null}
				{onCancelQueue ? (
					<Button className={styles.overlayAction} onPress={onCancelQueue}>
						{t("cancelQueue")}
					</Button>
				) : null}
				<Button className={styles.overlayAction} onPress={onCloseSkin}>
					{t("close")}
				</Button>
			</>
		);
	}
	if (overlay === "lastTrick" && view.lastTrick) {
		return (
			<>
				<p className={styles.overlayTitle}>{t("lastTrick")}</p>
				<div className={styles.lastTrick}>
					{view.lastTrick.cards.map((card) => (
						<CardFace key={`${card.seatId}-${card.order}`} cardId={card.cardId} size="token" />
					))}
				</div>
				<Button className={styles.overlayAction} onPress={onCloseSkin}>
					{t("close")}
				</Button>
			</>
		);
	}
	if (inspectedTask) {
		return (
			<>
				<p className={styles.overlayTitle}>{t("task")}</p>
				<div className={styles.inspectCard}>
					<TaskCatalogCard task={inspectedTask.spec} status={inspectedTask.status} showMeta />
				</div>
				<Button className={styles.overlayAction} onPress={onCloseSkin}>
					{t("close")}
				</Button>
			</>
		);
	}
	if (sonarDetailSeat) {
		return (
			<>
				<SonarDetailBody seat={sonarDetailSeat} />
				<Button className={styles.overlayAction} onPress={onCloseSkin}>
					{t("close")}
				</Button>
			</>
		);
	}
	return (
		<>
			<p className={styles.overlayTitle}>{t("reminder")}</p>
			<p className={styles.overlayCopy}>{t("reminderCopy")}</p>
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
