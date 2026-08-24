import type { CardId } from "@crew/protocol";
import type { HandCard, SeatView, TableView, TaskView } from "@crew/view-model/fixtures";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { Button } from "react-aria-components";
import { CardFace } from "./Card.tsx";
import { seatIsEmpty, seatName, turnCopy } from "./copy.ts";
import { fanAngle, fanRise, fanShift, fanSpread, nearestFanIndex } from "./hand-fan.ts";
import styles from "./parts.module.css";
import { taskLabel } from "./task-label.ts";

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
			<span className={styles.pipName}>{seatName(seat)}</span>
			<span className={styles.captain} data-on={seat.isCaptain ? "true" : "false"}>
				C
			</span>
			<span className={styles.sonar} data-state={seat.sonar.state} />
			{seat.region !== "seat.self" ? <span className={styles.count}>{seat.handCount}</span> : null}
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

export function SelfDock({
	seat,
	canSonar,
	canPlay,
	canPass,
	onSonar,
	onPlay,
	onPass,
	onPeekLastTrick,
}: {
	seat: SeatView;
	canSonar: boolean;
	canPlay: boolean;
	canPass: boolean;
	onSonar?: () => void;
	onPlay?: () => void;
	onPass?: () => void;
	onPeekLastTrick?: () => void;
}) {
	return (
		<div
			className={styles.dock}
			data-region={seat.region}
			data-turn={seat.isTurn ? "true" : "false"}
		>
			<div className={styles.dockMeta}>
				<span className={styles.pipName}>{seatName(seat)}</span>
				<span className={styles.captain} data-on={seat.isCaptain ? "true" : "false"}>
					C
				</span>
				<span className={styles.sonar} data-state={seat.sonar.state} />
				<WonCount count={seat.wonTrickCount} onPeek={onPeekLastTrick} />
			</div>
			<div className={styles.dockTasks} data-region="tasks.self">
				{seat.tasks.map((task) => (
					<TaskMark key={task.instanceId} task={task} />
				))}
			</div>
			<div className={styles.dockActions}>
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
				{canPlay && onPlay ? (
					<Button className={styles.textAction} onPress={onPlay}>
						Play
					</Button>
				) : null}
			</div>
		</div>
	);
}

export function TaskMark({ task }: { task: TaskView }) {
	return (
		<span
			className={styles.task}
			data-status={task.status}
			data-takeable={task.takeable ? "true" : "false"}
			data-region={task.region}
		>
			{taskLabel(task.spec)}
		</span>
	);
}

export function TaskCard({ task, onTake }: { task: TaskView; onTake?: (task: TaskView) => void }) {
	const body = <span className={styles.taskFace}>{taskLabel(task.spec)}</span>;
	if (task.takeable && onTake) {
		return (
			<Button
				className={styles.taskCard}
				data-status={task.status}
				data-takeable="true"
				data-region={task.region}
				onPress={() => onTake(task)}
			>
				{body}
			</Button>
		);
	}
	return (
		<div className={styles.taskCard} data-status={task.status} data-region={task.region}>
			{body}
		</div>
	);
}

export function HandStrip({
	cards,
	selected,
	quiet = false,
	onSelect,
}: {
	cards: HandCard[];
	selected: CardId | null;
	quiet?: boolean;
	onSelect?: (cardId: CardId) => void;
}) {
	const rootRef = useRef<HTMLDivElement>(null);
	const dragging = useRef(false);
	const peekedIndex = useRef(0);
	const peekedId = useRef<CardId | null>(null);
	const [peeked, setPeeked] = useState<CardId | null>(null);
	const [fanWidth, setFanWidth] = useState(320);
	const [cardWidth, setCardWidth] = useState(56);
	const spread = fanSpread(cards.length);

	useEffect(() => {
		const el = rootRef.current;
		if (!el) {
			return;
		}
		const measure = () => {
			setFanWidth(el.getBoundingClientRect().width);
			const slot = el.firstElementChild;
			if (slot instanceof HTMLElement) {
				const width = slot.getBoundingClientRect().width;
				if (width > 0) {
					setCardWidth(width);
				}
			}
		};
		measure();
		const observer = new ResizeObserver(measure);
		observer.observe(el);
		return () => observer.disconnect();
	}, [cards.length]);

	function cardAtPointer(
		event: ReactPointerEvent<HTMLDivElement>,
		sticky?: number,
	): { id: CardId; index: number } | null {
		const el = rootRef.current;
		if (!el || cards.length === 0) {
			return null;
		}
		const rect = el.getBoundingClientRect();
		const index = nearestFanIndex(event.clientX - rect.left, rect.width, cards.length, sticky);
		const id = cards[index]?.cardId;
		if (id === undefined) {
			return null;
		}
		return { id, index };
	}

	function beginPeek(event: ReactPointerEvent<HTMLDivElement>) {
		if (event.button !== 0 || cards.length === 0) {
			return;
		}
		event.preventDefault();
		dragging.current = true;
		event.currentTarget.setPointerCapture(event.pointerId);
		const hit = cardAtPointer(event);
		if (hit) {
			peekedIndex.current = hit.index;
			peekedId.current = hit.id;
			setPeeked(hit.id);
		}
	}

	function movePeek(event: ReactPointerEvent<HTMLDivElement>) {
		if (!dragging.current) {
			return;
		}
		const hit = cardAtPointer(event, peekedIndex.current);
		if (hit && hit.index !== peekedIndex.current) {
			peekedIndex.current = hit.index;
			peekedId.current = hit.id;
			setPeeked(hit.id);
		}
	}

	function endPeek(event: ReactPointerEvent<HTMLDivElement>) {
		if (!dragging.current) {
			return;
		}
		dragging.current = false;
		if (event.currentTarget.hasPointerCapture(event.pointerId)) {
			event.currentTarget.releasePointerCapture(event.pointerId);
		}
		const hit = peekedId.current;
		peekedId.current = null;
		setPeeked(null);
		if (hit) {
			onSelect?.(hit);
		}
	}

	return (
		<div
			ref={rootRef}
			className={quiet ? `${styles.fan} ${styles.fanQuiet}` : styles.fan}
			data-region="hand"
			onPointerDown={beginPeek}
			onPointerMove={movePeek}
			onPointerUp={endPeek}
			onPointerCancel={endPeek}
		>
			{cards.map((card, index) => {
				const raised = peeked !== null ? peeked === card.cardId : selected === card.cardId;
				const shift = fanShift(index, cards.length, fanWidth, cardWidth);
				const rise = fanRise(index, cards.length, 20);
				return (
					<div
						key={card.cardId}
						className={styles.fanSlot}
						data-raised={raised ? "true" : "false"}
						style={
							{
								"--angle": `${fanAngle(index, cards.length, spread)}deg`,
								"--x": `${shift}px`,
								"--y": `${rise}px`,
								"--z": raised ? 24 : index + 1,
							} as CSSProperties
						}
					>
						<CardFace
							cardId={card.cardId}
							legal={card.legal}
							communicated={card.communicated}
							selected={selected === card.cardId}
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
		</div>
	);
}
