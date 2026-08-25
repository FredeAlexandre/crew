import type { CardId, SonarPosition } from "@crew/protocol";
import type { HandCard, SeatView, TableView, TaskView } from "@crew/view-model/fixtures";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { useRef } from "react";
import { Button } from "react-aria-components";
import { useSfxMuted } from "../../hooks/use-sfx-muted.ts";
import { CardBack, CardFace } from "./Card.tsx";
import { type LobbySlot, seatIsEmpty, seatName, sonarPositionCopy, turnCopy } from "./copy.ts";
import { cardIndexFromRects } from "./hand-layout.ts";
import styles from "./parts.module.css";
import { type TaskCardSize, TaskCatalogCard } from "./TaskCatalogCard.tsx";

function SonarIcon() {
	return (
		<svg className={styles.sonarIcon} viewBox="0 0 16 16" aria-hidden="true">
			<path
				d="M8 11.5a3.5 3.5 0 0 0 3.5-3.5M8 13a5 5 0 0 0 5-5M8 14.5a6.5 6.5 0 0 0 6.5-6.5"
				fill="none"
				stroke="currentColor"
				strokeWidth="1.4"
				strokeLinecap="round"
			/>
			<circle cx="8" cy="8" r="1.1" fill="currentColor" />
		</svg>
	);
}

function CrownIcon() {
	return (
		<svg className={styles.crown} viewBox="0 0 20 14" aria-hidden="true">
			<path d="M2 11.5 4.2 4.8l3.3 3.6L10 3.5l2.5 4.9 3.3-3.6L18 11.5H2Z" fill="currentColor" />
			<rect x="2" y="11.5" width="16" height="2" rx="0.4" fill="currentColor" />
		</svg>
	);
}

function seatInitial(seat: SeatView): string {
	if (seatIsEmpty(seat)) {
		return "";
	}
	const name = seatName(seat).trim();
	if (name.length === 0) {
		return "?";
	}
	return name.charAt(0).toUpperCase();
}

export function SeatAvatar({
	seat,
	self = false,
	compact = false,
	showName = true,
}: {
	seat: SeatView;
	self?: boolean;
	compact?: boolean;
	showName?: boolean;
}) {
	const empty = seatIsEmpty(seat);
	return (
		<div
			className={compact ? styles.avatarWrapCompact : styles.avatarWrap}
			data-turn={seat.isTurn ? "true" : "false"}
			data-captain={seat.isCaptain ? "true" : "false"}
			data-connected={seat.connected ? "true" : "false"}
			data-leaving={seat.leaving ? "true" : "false"}
		>
			{seat.isCaptain ? <CrownIcon /> : <span className={styles.crownHole} aria-hidden="true" />}
			{seat.isCaptain ? <span className={styles.srOnly}>Captain</span> : null}
			{seat.isTurn ? <span className={styles.srOnly}>Their turn</span> : null}
			<span
				className={compact ? styles.avatarCompact : styles.avatar}
				data-empty={empty ? "true" : "false"}
				data-self={self ? "true" : "false"}
				aria-hidden="true"
			>
				{seat.image ? (
					<img className={styles.avatarPhoto} src={seat.image} alt="" />
				) : (
					seatInitial(seat)
				)}
			</span>
			{!empty && !seat.connected ? (
				<span
					className={styles.connectionDots}
					role="img"
					aria-label={seat.leaving ? "Leaving" : "Reconnecting"}
				>
					•••
				</span>
			) : null}
			{showName ? <span className={styles.pipName}>{empty ? "Empty" : seatName(seat)}</span> : null}
		</div>
	);
}

function WonTrickPile({ count, onPeek }: { count: number; onPeek?: () => void }) {
	const body = (
		<>
			<span className={styles.wonStack} aria-hidden="true">
				<CardBack size="token" />
				<CardBack size="token" />
				<CardBack size="token" />
			</span>
			<span className={styles.wonCount}>{count}</span>
		</>
	);
	const label = count === 1 ? "1 trick won" : `${count} tricks won`;
	if (onPeek) {
		return (
			<Button className={styles.wonPile} onPress={onPeek} aria-label={`${label}. Peek last trick.`}>
				{body}
			</Button>
		);
	}
	return (
		<div className={styles.wonPile} role="img" aria-label={label}>
			{body}
		</div>
	);
}

function SonarTokenButton({
	state,
	onPress,
}: {
	state: SeatView["sonar"]["state"];
	onPress?: () => void;
}) {
	const available = state === "available";
	const body = (
		<span className={styles.sonarToken} data-state={state}>
			<SonarIcon />
		</span>
	);
	if (onPress) {
		return (
			<Button
				className={styles.sonarTokenBtn}
				onPress={onPress}
				aria-label={available ? "Sonar available" : "Sonar used"}
			>
				{body}
			</Button>
		);
	}
	return body;
}

function CommunicatedSlot({
	cardId,
	position,
	onPress,
}: {
	cardId: CardId;
	position: SonarPosition;
	onPress?: () => void;
}) {
	const body = (
		<span className={styles.commSlot}>
			<CardFace cardId={cardId} communicated size="token" />
			<span className={styles.commSonarMark} data-position={position}>
				<SonarIcon />
			</span>
		</span>
	);
	if (onPress) {
		return (
			<Button className={styles.commSlotBtn} onPress={onPress} aria-label="Sonar clue">
				{body}
			</Button>
		);
	}
	return body;
}

export function PlaySeat({
	seat,
	slot,
	onPeekLastTrick,
	onSonarDetail,
	onInspectTask,
	canSonar,
	canPass,
	onSonar,
	onPass,
	chairClassName,
}: {
	seat: SeatView;
	slot: LobbySlot;
	onPeekLastTrick?: () => void;
	onSonarDetail?: () => void;
	onInspectTask?: (task: TaskView) => void;
	canSonar?: boolean;
	canPass?: boolean;
	onSonar?: () => void;
	onPass?: () => void;
	chairClassName?: string;
}) {
	const empty = seatIsEmpty(seat);
	const self = seat.region === "seat.self";
	const communication = seat.sonar.communication;
	return (
		<div
			className={chairClassName}
			data-region={seat.region}
			data-slot={slot}
			data-turn={seat.isTurn ? "true" : "false"}
			data-empty={empty ? "true" : "false"}
			data-self={self ? "true" : "false"}
		>
			<div className={styles.playSeat} data-slot={slot}>
				<div className={styles.seatHead}>
					<SeatAvatar seat={seat} self={self} />
				</div>
				<div className={styles.seatBody}>
					<WonTrickPile count={seat.wonTrickCount} onPeek={onPeekLastTrick} />
					<div className={styles.seatTasks} data-region={self ? "tasks.self" : undefined}>
						{seat.tasks.length > 0 ? (
							seat.tasks.map((task) => (
								<TaskMark
									key={task.instanceId}
									task={task}
									size={self ? "self" : "compact"}
									onInspect={onInspectTask}
								/>
							))
						) : (
							<span className={styles.taskHole} aria-hidden="true" />
						)}
					</div>
					<div className={styles.seatSonar}>
						{communication ? (
							<CommunicatedSlot
								cardId={communication.cardId}
								position={communication.position}
								onPress={onSonarDetail}
							/>
						) : (
							<SonarTokenButton state={seat.sonar.state} onPress={onSonarDetail} />
						)}
					</div>
				</div>
				{self ? (
					<div className={styles.seatActions}>
						{canSonar && onSonar ? (
							<Button className={styles.textAction} onPress={onSonar}>
								Sonar
							</Button>
						) : null}
						{canPass && onPass ? (
							<Button className={styles.textAction} onPress={onPass}>
								Pass
							</Button>
						) : null}
					</div>
				) : null}
			</div>
		</div>
	);
}

export function SonarDetailBody({ seat }: { seat: SeatView }) {
	const communication = seat.sonar.communication;
	return (
		<>
			<p className={styles.detailTitle}>{seatName(seat)} — Sonar</p>
			{communication ? (
				<>
					<CommunicatedSlot cardId={communication.cardId} position={communication.position} />
					<p className={styles.detailCopy}>{sonarPositionCopy(communication.position)}</p>
				</>
			) : (
				<>
					<SonarTokenButton state={seat.sonar.state} />
					<p className={styles.detailCopy}>
						{seat.sonar.state === "available"
							? "Sonar is available. This player has not communicated yet."
							: "Sonar has already been used this mission."}
					</p>
				</>
			)}
		</>
	);
}

function WonCount({
	count,
	onPeek,
	hole = false,
}: {
	count: number;
	onPeek?: () => void;
	hole?: boolean;
}) {
	if (count <= 0) {
		return hole ? <span className={styles.wonHole} /> : null;
	}
	if (onPeek) {
		return (
			<Button className={styles.wonPeek} onPress={onPeek} aria-label="Last trick">
				{count}
			</Button>
		);
	}
	return <span className={styles.won}>{count}</span>;
}

export function SeatPip({
	seat,
	compact = false,
	onPeekLastTrick,
}: {
	seat: SeatView;
	compact?: boolean;
	onPeekLastTrick?: () => void;
}) {
	const empty = seatIsEmpty(seat);
	return (
		<div
			className={compact ? styles.pipCompact : styles.pip}
			data-region={seat.region}
			data-turn={seat.isTurn ? "true" : "false"}
			data-empty={empty ? "true" : "false"}
		>
			<SeatAvatar seat={seat} self={seat.region === "seat.self"} compact={compact} />
			<span className={styles.sonar} data-state={seat.sonar.state} />
			<WonCount count={seat.wonTrickCount} onPeek={onPeekLastTrick} hole />
			{seat.sonar.communication ? (
				<CardFace cardId={seat.sonar.communication.cardId} communicated size="token" />
			) : null}
			{compact && seat.tasks.length > 0 ? (
				<span className={styles.taskCount}>{seat.tasks.length}</span>
			) : null}
			{!compact && seat.tasks.length > 0 ? (
				<div className={styles.dockTasks}>
					{seat.tasks.map((task) => (
						<TaskMark key={task.instanceId} task={task} />
					))}
				</div>
			) : null}
		</div>
	);
}

export function TaskMark({
	task,
	size = "compact",
	onInspect,
}: {
	task: TaskView;
	size?: Exclude<TaskCardSize, "catalog">;
	onInspect?: (task: TaskView) => void;
}) {
	return (
		<TaskCatalogCard
			task={task.spec}
			size={size}
			status={task.status}
			region={task.region}
			onPress={onInspect ? () => onInspect(task) : undefined}
		/>
	);
}

export function TaskCard({ task, onTake }: { task: TaskView; onTake?: (task: TaskView) => void }) {
	return (
		<TaskCatalogCard
			task={task.spec}
			size="table"
			status={task.status}
			takeable={task.takeable}
			showMeta
			region={task.region}
			onPress={task.takeable && onTake ? () => onTake(task) : undefined}
		/>
	);
}

export function HandStrip({
	cards,
	selected,
	quiet = false,
	nudged = null,
	onSelect,
	onActivate,
}: {
	cards: HandCard[];
	selected: CardId | null;
	quiet?: boolean;
	nudged?: CardId | null;
	onSelect?: (cardId: CardId) => void;
	onActivate?: (cardId: CardId) => void;
}) {
	const rootRef = useRef<HTMLDivElement>(null);
	const peeking = useRef(false);
	const moved = useRef(false);
	const startSelected = useRef<CardId | null>(null);
	const startX = useRef(0);
	const startY = useRef(0);
	const selectedIndex =
		selected === null ? -1 : cards.findIndex((card) => card.cardId === selected);

	function cardAtPointer(
		event: ReactPointerEvent<HTMLDivElement>,
	): { id: CardId; index: number } | null {
		const el = rootRef.current;
		if (!el || cards.length === 0) {
			return null;
		}
		const rects = Array.from(el.children, (slot) => slot.getBoundingClientRect());
		const index = cardIndexFromRects(
			event.clientX,
			event.clientY,
			rects,
			selectedIndex >= 0 ? selectedIndex : null,
		);
		const id = index === null ? undefined : cards[index]?.cardId;
		if (index === null || id === undefined) {
			return null;
		}
		return { id, index };
	}

	function selectAtPointer(event: ReactPointerEvent<HTMLDivElement>) {
		const hit = cardAtPointer(event);
		if (hit) {
			onSelect?.(hit.id);
		}
	}

	function beginPeek(event: ReactPointerEvent<HTMLDivElement>) {
		if (event.button !== 0 || cards.length === 0) {
			return;
		}
		event.preventDefault();
		startSelected.current = selected;
		moved.current = false;
		startX.current = event.clientX;
		startY.current = event.clientY;
		const touchLike = event.pointerType === "touch" || event.pointerType === "pen";
		if (touchLike) {
			peeking.current = true;
			event.currentTarget.setPointerCapture(event.pointerId);
		}
		selectAtPointer(event);
	}

	function movePeek(event: ReactPointerEvent<HTMLDivElement>) {
		const dx = event.clientX - startX.current;
		const dy = event.clientY - startY.current;
		if (dx * dx + dy * dy > 100) {
			moved.current = true;
		}
		if (peeking.current || event.buttons > 0) {
			selectAtPointer(event);
			return;
		}
		if (event.pointerType === "mouse") {
			selectAtPointer(event);
		}
	}

	function endPeek(event: ReactPointerEvent<HTMLDivElement>) {
		const hit = cardAtPointer(event);
		if (peeking.current) {
			peeking.current = false;
			if (event.currentTarget.hasPointerCapture(event.pointerId)) {
				event.currentTarget.releasePointerCapture(event.pointerId);
			}
		}
		if (event.type === "pointercancel") {
			if (hit) {
				onSelect?.(hit.id);
			}
			return;
		}
		if (!moved.current && hit !== null && hit.id === startSelected.current) {
			onActivate?.(hit.id);
			return;
		}
		if (hit) {
			onSelect?.(hit.id);
		}
	}

	return (
		<div
			ref={rootRef}
			className={quiet ? `${styles.fan} ${styles.fanQuiet}` : styles.fan}
			data-region="hand"
			data-count={String(cards.length)}
			onPointerDown={beginPeek}
			onPointerMove={movePeek}
			onPointerUp={endPeek}
			onPointerCancel={endPeek}
		>
			{cards.map((card, index) => {
				const raised = selected === card.cardId;
				return (
					<div
						key={card.cardId}
						className={styles.fanSlot}
						data-raised={raised ? "true" : "false"}
						data-nudge={nudged === card.cardId ? "true" : "false"}
						style={
							{
								"--i": index,
								"--n": cards.length,
								"--z": raised ? 24 : index + 1,
							} as CSSProperties
						}
					>
						<CardFace
							cardId={card.cardId}
							legal={card.legal}
							communicated={card.communicated}
							selected={raised}
							muted={quiet}
							revealed={raised}
						/>
					</div>
				);
			})}
		</div>
	);
}

export function ChromeLine({ view }: { view: TableView }) {
	const turn = turnCopy(view);
	const [muted, setMuted] = useSfxMuted();
	const bits = [
		view.chrome.missionId ? `Mission ${view.chrome.missionId.replace(/^m/i, "")}` : null,
		view.chrome.trickId ? `Trick ${view.chrome.trickId}` : null,
		view.chrome.distress.active ? "Distress" : null,
	].filter((bit): bit is string => bit !== null);
	return (
		<div className={styles.chrome} data-region="chrome">
			{bits.map((bit) => (
				<span key={bit}>{bit}</span>
			))}
			{turn ? <span className={styles.turn}>{turn}</span> : null}
			<Button
				className={styles.mute}
				data-on={muted ? "false" : "true"}
				aria-pressed={!muted}
				aria-label={muted ? "Sound off" : "Sound on"}
				onPress={() => setMuted(!muted)}
			>
				{muted ? "Muted" : "Sound"}
			</Button>
		</div>
	);
}
