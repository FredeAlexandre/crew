import type { CardId, DistressDirection, SonarPosition } from "@crew/protocol";
import type { Overlay, TableView, TaskView } from "@crew/view-model/fixtures";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Button } from "../../components/ui/button.tsx";
import type { ClientIntent } from "../../hooks/use-table.ts";
import { useI18n } from "../../lib/i18n.tsx";
import { playCue } from "../../lib/sfx.ts";
import { trickCardKey, trickJuice } from "../../lib/trick-juice.ts";
import { CardBack, CardFace } from "./Card.tsx";
import { illegalCopy, playLeadRegion, seatsInPlayOrder, turnCopy } from "./copy.ts";
import { sortHand } from "./hand-sort.ts";
import { HandStrip, PlaySeat, SonarDetailBody, TaskCard } from "./parts.tsx";
import styles from "./play.module.css";
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
	const [sonarDetailRegion, setSonarDetailRegion] = useState<
		TableView["seats"][number]["region"] | null
	>(null);
	const [inspectedTask, setInspectedTask] = useState<TaskView | null>(null);
	const [inspectedCompletedTricks, setInspectedCompletedTricks] = useState<
		TableView["seats"][number] | null
	>(null);
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
				: inspectedCompletedTricks !== null
					? "lastTrick"
					: sonarDetailRegion !== null || inspectedTask !== null
						? "reminder"
						: "none";
	const { t } = useI18n();
	const selectedCard = view.hand.find((card) => card.cardId === selected);
	const hint =
		selectedCard && !selectedCard.legal ? illegalCopy(selectedCard.illegalReason, t) : null;
	const canPlaySelected = Boolean(view.affordances.canPlay && selectedCard?.legal && !sonarOpen);
	const canPassSelected = Boolean(view.affordances.canPassDistressCard && selectedCard?.legal);
	const showHandDock = view.scene === "play" || view.affordances.canPassDistressCard;
	const handTucked =
		view.scene === "play" &&
		!view.affordances.canPlay &&
		!view.affordances.canPassDistressCard &&
		!sonarOpen;
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
	const canInspectCompletedTricks =
		view.scene === "play" &&
		view.chrome.flags.completedTricksVisible &&
		view.overlay === "none" &&
		!sonarOpen;
	const isDraft = view.scene === "taskDraft";
	const quietHand = isDraft || view.scene === "deal";
	const turn = isDraft ? turnCopy(view, t) : null;
	const shownTrickCards = heldCards ?? view.trick.cards;
	const shownLeadRegion =
		heldCards === null
			? view.trick.leadRegion
			: (heldCards.find((card) => card.order === 1)?.region ?? null);
	const orderedSeats = seatsInPlayOrder(shownSeats, playLeadRegion(view, shownLeadRegion));
	const landKeySet = new Set(heldCards === null ? landKeys : []);

	useEffect(() => {
		if (view.overlay !== "none") {
			setSonarOpen(false);
			setSonarDetailRegion(null);
			setInspectedTask(null);
			setInspectedCompletedTricks(null);
		}
	}, [view.overlay]);

	useEffect(() => {
		setSonarOpen(false);
		setSonarDetailRegion(null);
		setInspectedTask(null);
		setInspectedCompletedTricks(null);
		setSelected(null);
		setQueuedSonar(null);
		setHeldCards(null);
		setWinnerRegion(null);
		setTrickTransition(null);
	}, [view.attemptId]);

	useEffect(() => {
		if (handTucked) {
			setSelected(null);
		}
	}, [handTucked]);

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
		if (juice.holdCards && heldCards === null) {
			setHeldCards(juice.holdCards);
			setWinnerRegion(juice.winnerRegion);
			setTrickTransition({ remaining: TRICK_TRANSITION_MS, paused: false });
		} else if (view.trick.cards.length > 0 && heldCards === null) {
			setHeldCards(null);
			setWinnerRegion(null);
			setTrickTransition(null);
		}
	}, [view]);

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
		if (
			!sonarOpen &&
			sonarDetailRegion === null &&
			inspectedTask === null &&
			inspectedCompletedTricks === null
		) {
			return;
		}
		function onKey(event: KeyboardEvent) {
			if (event.key === "Escape") {
				setSonarOpen(false);
				setSonarDetailRegion(null);
				setInspectedTask(null);
				setInspectedCompletedTricks(null);
			}
		}
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [sonarOpen, sonarDetailRegion, inspectedTask, inspectedCompletedTricks]);

	function openSonar() {
		setSonarDetailRegion(null);
		setInspectedTask(null);
		setInspectedCompletedTricks(null);
		if (queuedSonar !== null) {
			setSelected(queuedSonar.cardId);
		}
		setSonarOpen(true);
	}

	function openSonarDetail(region: TableView["seats"][number]["region"]) {
		setSonarOpen(false);
		setInspectedTask(null);
		setInspectedCompletedTricks(null);
		setSonarDetailRegion(region);
	}

	function inspectTask(task: TaskView) {
		setSonarOpen(false);
		setSonarDetailRegion(null);
		setInspectedTask(task);
		setInspectedCompletedTricks(null);
	}

	function inspectCompletedTricks(seat: TableView["seats"][number]) {
		if (!canInspectCompletedTricks || seat.completedTricks.length === 0) {
			return;
		}
		setSonarOpen(false);
		setSonarDetailRegion(null);
		setInspectedTask(null);
		setInspectedCompletedTricks(seat);
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

	function predictTricks(count: number) {
		sendIntent?.({ type: "task.predict", count });
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
		setSonarDetailRegion(null);
		setInspectedTask(null);
		setInspectedCompletedTricks(null);
	}

	return (
		<div
			className={styles.table}
			data-scene={view.scene}
			data-overlay={overlay}
			data-tucked={handTucked ? "true" : "false"}
		>
			{overlay !== "none" ? (
				<div className={styles.overlayLayer} data-region="overlay">
					<div className={styles.overlay}>
						<OverlayBody
							view={view}
							overlay={overlay}
							sonarDetailSeat={sonarDetailSeat}
							inspectedTask={inspectedTask}
							inspectedCompletedTricks={inspectedCompletedTricks}
							sonarPositions={sonarPositions}
							queued={!view.affordances.canSonar}
							onSkipDistress={
								view.affordances.canSkipDistress && sendIntent ? skipDistress : undefined
							}
							onActivateDistress={
								view.affordances.canActivateDistress && sendIntent ? activateDistress : undefined
							}
							onUseSonar={useSonar}
							onPredict={view.affordances.canPredict && sendIntent ? predictTricks : undefined}
							onCancelQueue={queuedSonar !== null ? cancelQueuedSonar : undefined}
							onCloseSkin={closeSkinOverlay}
						/>
					</div>
				</div>
			) : null}
			<div className={styles.playBoard} data-count={String(view.playerCount)}>
				<div className={styles.heads} data-count={String(view.playerCount)}>
					{orderedSeats.map((seat) => {
						const isSelf = seat.region === "seat.self";
						return (
							<PlaySeat
								key={seat.region}
								seat={seat}
								chairClassName={styles.playChair}
								onPeekLastTrick={
									canInspectCompletedTricks && seat.completedTricks.length > 0
										? () => inspectCompletedTricks(seat)
										: undefined
								}
								onSonarDetail={() => openSonarDetail(seat.region)}
								onInspectTask={inspectTask}
								canSonar={isSelf && sonarEnabled && !sonarOpen}
								canPass={isSelf && isDraft && view.affordances.canPassTask}
								onSonar={isSelf ? openSonar : undefined}
								onPass={isSelf && isDraft ? passTask : undefined}
							/>
						);
					})}
				</div>
				<div className={styles.playWell}>
					<Well
						view={view}
						turn={turn}
						trickCards={shownTrickCards}
						leadRegion={shownLeadRegion}
						landKeys={landKeySet}
						winnerRegion={heldCards === null ? null : winnerRegion}
						trickTransition={heldCards === null ? null : trickTransition}
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
			<div className={styles.handWrap} data-tucked={handTucked ? "true" : "false"}>
				{hint && overlay !== "sonar" ? <p className={styles.hint}>{hint}</p> : null}
				{showHandDock ? (
					<div className={styles.handDock}>
						<Button
							variant="outline"
							className={styles.handAction}
							isDisabled={!sonarEnabled || sonarOpen}
							onPress={openSonar}
						>
							{t("sonar")}
						</Button>
						{view.affordances.canPassDistressCard ? (
							<Button isDisabled={!canPassSelected} onPress={passDistressCard}>
								{t("pass")}
							</Button>
						) : (
							<Button isDisabled={!canPlaySelected} onPress={playCard}>
								{t("play")}
							</Button>
						)}
					</div>
				) : null}
				<HandStrip
					cards={displayHand}
					selected={selected}
					quiet={quietHand}
					tucked={handTucked}
					nudged={nudged}
					onSelect={handTucked ? undefined : setSelected}
					onActivate={quietHand || handTucked ? undefined : activateCard}
				/>
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
	const { t } = useI18n();
	if (view.scene === "taskDraft") {
		const anyTakeable = view.centerTasks.some((task) => task.takeable);
		return (
			<div className={styles.draftWell} data-region="tasks.center">
				{turn ? (
					<p className={styles.draftPrompt}>
						{turn}. {t("takeTask")}
					</p>
				) : null}
				<div className={styles.taskRow}>
					{view.centerTasks.map((task) => (
						<TaskCard
							key={task.instanceId}
							task={task}
							onTake={onTake}
							muted={anyTakeable && !task.takeable}
						/>
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
				<p className={styles.stockLabel}>{t("dealing")}</p>
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
				{[...trickCards]
					.sort((a, b) => a.order - b.order)
					.map((card) => (
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
	const { t } = useI18n();
	const percent = Math.round((transition.remaining / TRICK_TRANSITION_MS) * 100);
	return (
		<div className={styles.trickTransition}>
			<div
				className={styles.trickProgress}
				role="progressbar"
				aria-label={t("nextTrickProgress")}
				aria-valuemin={0}
				aria-valuemax={100}
				aria-valuenow={percent}
			>
				<span style={{ transform: `scaleX(${percent / 100})` }} />
			</div>
			<Button variant="outline" size="sm" onPress={onToggle}>
				{transition.paused ? t("startNextTrick") : t("keepTrickVisible")}
			</Button>
		</div>
	);
}

function OverlayBody({
	view,
	overlay,
	sonarDetailSeat,
	inspectedTask,
	inspectedCompletedTricks,
	sonarPositions,
	queued = false,
	onSkipDistress,
	onActivateDistress,
	onUseSonar,
	onPredict,
	onCancelQueue,
	onCloseSkin,
}: {
	view: TableView;
	overlay: Overlay;
	sonarDetailSeat: TableView["seats"][number] | null;
	inspectedTask: TaskView | null;
	inspectedCompletedTricks: TableView["seats"][number] | null;
	sonarPositions: SonarPosition[];
	queued?: boolean;
	onSkipDistress?: () => void;
	onActivateDistress?: (direction: DistressDirection) => void;
	onUseSonar: (position: SonarPosition) => void;
	onPredict?: (count: number) => void;
	onCancelQueue?: () => void;
	onCloseSkin: () => void;
}) {
	const { t } = useI18n();
	if (overlay === "predict") {
		const max = view.chrome.maxTricks ?? 10;
		const hidden = view.seats
			.flatMap((seat) => seat.tasks)
			.some((task) => task.spec.kind === "predictTricks" && task.spec.reveal === "hidden");
		return (
			<>
				<p className={styles.overlayTitle}>{t("predictTitle")}</p>
				<p className={styles.overlayCopy}>{hidden ? t("predictHiddenCopy") : t("predictCopy")}</p>
				{onPredict ? (
					<div className={styles.overlayActions}>
						{Array.from({ length: max + 1 }, (_, count) => (
							<Button key={count} onPress={() => onPredict(count)}>
								{count}
							</Button>
						))}
					</div>
				) : (
					<p className={styles.overlayCopy}>{t("waitingCrew")}</p>
				)}
			</>
		);
	}
	if (overlay === "distress") {
		if (view.affordances.canActivateDistress || view.affordances.canSkipDistress) {
			return (
				<>
					<p className={styles.overlayTitle}>{t("distressSignal")}</p>
					<p className={styles.overlayCopy}>{t("passColorCard")}</p>
					<div className={styles.overlayActions}>
						{onSkipDistress ? <Button onPress={onSkipDistress}>{t("skip")}</Button> : null}
						{onActivateDistress ? (
							<>
								<Button onPress={() => onActivateDistress("left")}>{t("passRight")}</Button>
								<Button onPress={() => onActivateDistress("right")}>{t("passLeft")}</Button>
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
							<Button key={position} onPress={() => onUseSonar(position)}>
								{t(position)}
							</Button>
						))}
					</div>
				) : null}
				{onCancelQueue ? (
					<Button variant="ghost" onPress={onCancelQueue}>
						{t("cancelQueue")}
					</Button>
				) : null}
				<Button variant="ghost" onPress={onCloseSkin}>
					{t("close")}
				</Button>
			</>
		);
	}
	if (overlay === "lastTrick" && inspectedCompletedTricks) {
		return (
			<>
				<p className={styles.overlayTitle}>
					{t("tricksWonNamed", { name: inspectedCompletedTricks.displayName ?? t("crew") })}
				</p>
				<div className={styles.completedTricks}>
					{inspectedCompletedTricks.completedTricks.map((trick) => (
						<div key={trick.trickId} className={styles.lastTrick}>
							<span className={styles.completedTrickLabel}>
								{t("trick", { number: trick.trickId })}
							</span>
							{trick.cards.map((card) => (
								<CardFace
									key={`${trick.trickId}-${card.seatId}-${card.order}`}
									cardId={card.cardId}
									size="token"
								/>
							))}
						</div>
					))}
				</div>
				<Button variant="ghost" onPress={onCloseSkin}>
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
					<TaskCatalogCard
						task={inspectedTask.spec}
						status={inspectedTask.status}
						prediction={inspectedTask.prediction}
					/>
				</div>
				<Button variant="ghost" onPress={onCloseSkin}>
					{t("close")}
				</Button>
			</>
		);
	}
	if (sonarDetailSeat) {
		return (
			<>
				<SonarDetailBody seat={sonarDetailSeat} />
				<Button variant="ghost" onPress={onCloseSkin}>
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
