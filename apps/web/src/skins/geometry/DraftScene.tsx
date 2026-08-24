import type { CardId } from "@crew/protocol";
import type { TableView, TaskView } from "@crew/view-model/fixtures";
import { useState } from "react";
import { opponentSeats, selfSeat, turnCopy } from "./copy.ts";
import { ChromeLine, HandStrip, SeatPip, SelfDock, TaskCard } from "./parts.tsx";
import styles from "./scenes.module.css";

export function DraftScene({
	view,
	onTake,
	onPass,
}: {
	view: TableView;
	onTake?: (task: TaskView) => void;
	onPass?: () => void;
}) {
	const [selected, setSelected] = useState<CardId | null>(null);
	const self = selfSeat(view);
	const turn = turnCopy(view);
	return (
		<div className={styles.market} data-scene="taskDraft">
			<div className={styles.pickers}>
				{opponentSeats(view).map((seat) => (
					<SeatPip key={seat.region} seat={seat} compact />
				))}
			</div>
			<ChromeLine view={view} />
			<div className={styles.marketWell} data-region="tasks.center">
				{turn ? <p className={styles.marketPrompt}>{turn}. Take a task.</p> : null}
				<div className={styles.taskRow}>
					{view.centerTasks.map((task) => (
						<TaskCard key={task.instanceId} task={task} onTake={onTake} />
					))}
				</div>
			</div>
			{self ? (
				<SelfDock
					seat={self}
					canSonar={false}
					canPass={view.affordances.canPassTask}
					onPass={onPass}
				/>
			) : null}
			<HandStrip cards={view.hand} selected={selected} quiet onSelect={setSelected} />
		</div>
	);
}
