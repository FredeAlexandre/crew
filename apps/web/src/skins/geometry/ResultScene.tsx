import type { TableView } from "@crew/view-model/fixtures";
import { useEffect, useState } from "react";
import { Button } from "react-aria-components";
import { playCue } from "../../lib/sfx.ts";
import { resultCopy, selfSeat } from "./copy.ts";
import { SeatPip, TaskMark } from "./parts.tsx";
import styles from "./scenes.module.css";

export function ResultScene({
	view,
	onRetry,
	enter = false,
}: {
	view: TableView;
	onRetry?: () => void;
	enter?: boolean;
}) {
	const [fresh] = useState(enter);
	const outcome = view.result?.outcome ?? "failed";
	const self = selfSeat(view);
	const failed = self?.tasks.filter((task) => task.status === "failed") ?? [];
	const reason = resultCopy(view.result?.reason ?? null);
	const mission = view.chrome.missionId
		? `Mission ${view.chrome.missionId.replace(/^m/i, "")}`
		: "Mission";

	useEffect(() => {
		if (!fresh) {
			return;
		}
		playCue(
			outcome === "won" ? "stingerWin" : "stingerFail",
			`result:${view.attemptId ?? "none"}:${outcome}`,
		);
	}, [fresh, outcome, view.attemptId]);
	return (
		<div className={styles.verdict} data-scene="result">
			<p className={styles.kicker}>{mission}</p>
			<h1 className={styles.outcome} data-outcome={outcome} data-enter={fresh ? "true" : undefined}>
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
			{view.affordances.canRetry && onRetry ? (
				<div className={styles.boardActions}>
					<Button className={styles.primary} onPress={onRetry}>
						Retry
					</Button>
				</div>
			) : null}
		</div>
	);
}
