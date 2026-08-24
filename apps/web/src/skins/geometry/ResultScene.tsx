import type { TableView } from "@crew/view-model/fixtures";
import { useEffect, useState } from "react";
import { Button } from "react-aria-components";
import { useI18n } from "../../lib/i18n.tsx";
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
	const { t } = useI18n();
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
		? t("mission", { number: view.chrome.missionId.replace(/^m/i, "") })
		: t("missionPlain");

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
				{outcome === "won" ? t("won") : t("missionFailed")}
			</h1>
			<section className={styles.review} aria-labelledby="mission-review">
				<h2 id="mission-review">{t("missionReview")}</h2>
				{outcome === "failed" ? (
					<>
						<p className={styles.lede}>
							{reason ?? t("defaultFailure")} {t("failureTiming")}
						</p>
						{failed.length > 0 ? (
							<ul className={styles.reviewList} aria-label={t("failedTasks")}>
								{failed.map(({ task, owner }) => (
									<li key={task.instanceId}>
										<TaskMark task={task} size="table" />
										<span>{t("ownerTaskFailed", { owner })}</span>
									</li>
								))}
							</ul>
						) : null}
					</>
				) : (
					<p className={styles.lede}>{t("success")}</p>
				)}
				<p className={styles.reviewSummary}>
					{t("taskSummary", { completed, total: tasks.length })}
				</p>
				{outcome === "failed" && incomplete.length > failed.length ? (
					<p className={styles.reviewRemaining}>
						{t(incomplete.length - failed.length === 1 ? "remainingOne" : "remainingMany", {
							count: incomplete.length - failed.length,
						})}
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
						{t("retry")}
					</Button>
				</div>
			) : null}
		</div>
	);
}
