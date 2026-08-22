import type { CardId } from "@crew/protocol";
import type { HandCard, SeatView, TableView, TaskView } from "@crew/view-model/fixtures";
import { Button } from "react-aria-components";
import { CardFace } from "./Card.tsx";
import { seatIsEmpty, seatName, turnCopy } from "./copy.ts";
import styles from "./parts.module.css";
import { taskLabel } from "./task-label.ts";

export function SeatPip({ seat, compact = false }: { seat: SeatView; compact?: boolean }) {
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
			{seat.wonTrickCount > 0 ? (
				<span className={styles.won}>{seat.wonTrickCount}</span>
			) : (
				<span className={styles.wonHole} />
			)}
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
}: {
	seat: SeatView;
	canSonar: boolean;
	canPlay: boolean;
	canPass: boolean;
	onSonar?: () => void;
	onPlay?: () => void;
	onPass?: () => void;
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
				{seat.wonTrickCount > 0 ? <span className={styles.won}>{seat.wonTrickCount}</span> : null}
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
	return (
		<div className={quiet ? styles.handQuiet : styles.hand} data-region="hand">
			{cards.map((card) => (
				<CardFace
					key={card.cardId}
					cardId={card.cardId}
					legal={card.legal}
					communicated={card.communicated}
					selected={selected === card.cardId}
					muted={quiet}
					onPress={onSelect ? () => onSelect(card.cardId) : undefined}
				/>
			))}
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
