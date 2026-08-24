import type { TableView } from "@crew/view-model/fixtures";
import { useEffect, useState } from "react";
import { Button } from "react-aria-components";
import { playCue } from "../../lib/sfx.ts";
import { resultCopy, seatName } from "./copy.ts";
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
	const tasks = view.seats.flatMap((seat) =>
		seat.tasks.map((task) => ({ task, owner: seatName(seat) })),
	);
	const failed = tasks.filter(({ task }) => task.status === "failed");
	const incomplete = tasks.filter(({ task }) => task.status !== "completed");
	const completed = tasks.length - incomplete.length;
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
			<section className={styles.review} aria-labelledby="mission-review">
				<h2 id="mission-review">Mission review</h2>
				{outcome === "failed" ? (
					<>
						<p className={styles.lede}>
							{reason ?? "The crew did not complete every assigned task."} A mission fails as soon
							as a task can no longer be completed.
						</p>
						{failed.length > 0 ? (
							<ul className={styles.reviewList} aria-label="Tasks that caused the failure">
								{failed.map(({ task, owner }) => (
									<li key={task.instanceId}>
										<TaskMark task={task} size="table" />
										<span>{owner}'s task could no longer be completed.</span>
									</li>
								))}
							</ul>
						) : null}
					</>
				) : (
					<p className={styles.lede}>
						Every assigned task was completed. The mission is a success.
					</p>
				)}
				<p className={styles.reviewSummary}>
					{completed} of {tasks.length} tasks completed
				</p>
				{outcome === "failed" && incomplete.length > failed.length ? (
					<p className={styles.reviewRemaining}>
						{incomplete.length - failed.length} other task
						{incomplete.length - failed.length === 1 ? " was" : "s were"} still unfinished when the
						mission ended.
					</p>
				) : null}
			</section>
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
