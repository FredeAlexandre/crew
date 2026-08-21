import type { TableView } from "@crew/view-model/fixtures";
import { Button } from "react-aria-components";
import { resultCopy, selfSeat } from "./copy.ts";
import { SeatPip, TaskMark } from "./parts.tsx";
import styles from "./scenes.module.css";

export function ResultScene({ view, onRetry }: { view: TableView; onRetry?: () => void }) {
	const outcome = view.result?.outcome ?? "failed";
	const self = selfSeat(view);
	const failed = self?.tasks.filter((task) => task.status === "failed") ?? [];
	const reason = resultCopy(view.result?.reason ?? null);
	const mission = view.chrome.missionId
		? `Mission ${view.chrome.missionId.replace(/^m/i, "")}`
		: "Mission";
	return (
		<div className={styles.verdict} data-scene="result">
			<p className={styles.kicker}>{mission}</p>
			<h1 className={styles.outcome} data-outcome={outcome}>
				{outcome === "won" ? "Won" : "Failed"}
			</h1>
			{reason ? <p className={styles.lede}>{reason}</p> : null}
			{failed.length > 0 ? (
				<div className={styles.failedTasks}>
					{failed.map((task) => (
						<TaskMark key={task.instanceId} task={task} />
					))}
				</div>
			) : null}
			<div className={styles.crewLineWrap}>
				{view.seats.map((seat) => (
					<SeatPip key={seat.region} seat={seat} compact />
				))}
			</div>
			{onRetry ? (
				<div className={styles.boardActions}>
					<Button className={styles.primary} onPress={onRetry}>
						Retry
					</Button>
				</div>
			) : null}
		</div>
	);
}
