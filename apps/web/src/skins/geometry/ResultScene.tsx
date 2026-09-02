import type { TableView } from "@crew/view-model/fixtures";
import { useEffect, useState } from "react";
import { Button } from "../../components/ui/button.tsx";
import { useI18n } from "../../lib/i18n.tsx";
import { playCue } from "../../lib/sfx.ts";
import { CardFace } from "./Card.tsx";
import { resultCopy, seatName } from "./copy.ts";
import { SeatPip, TaskMark } from "./parts.tsx";
import styles from "./scenes.module.css";
import { taskRenderParams } from "./task-label.ts";

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
	const params = taskRenderParams(view.playerCount);
	const outcome = view.result?.outcome ?? "failed";
	const tasks = view.seats.flatMap((seat) =>
		seat.tasks.map((task) => ({ task, owner: seatName(seat, t) })),
	);
	const failed = tasks.filter(({ task }) => task.status === "failed");
	const incomplete = tasks.filter(({ task }) => task.status !== "completed");
	const completed = tasks.length - incomplete.length;
	const reason = resultCopy(view.result?.reason ?? null, t);
	const mission = view.chrome.missionId
		? t("mission", { number: view.chrome.missionId.replace(/^m/i, "") })
		: t("missionPlain");
	const winnerName = (seatId: number) => {
		const seat = view.seats.find((entry) => entry.seatId === seatId);
		return seat ? seatName(seat, t) : t("crew");
	};

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
										<TaskMark task={task} size="table" params={params} />
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
			{view.history.length > 0 ? (
				<section className={styles.history} aria-labelledby="match-history">
					<h2 id="match-history">{t("matchHistory")}</h2>
					<ol className={styles.historyList}>
						{view.history.map((trick) => (
							<li key={trick.trickId} className={styles.historyTrick}>
								<p>
									{t("trick", { number: trick.trickId })} ·{" "}
									{t("trickWonBy", { name: winnerName(trick.winnerSeatId) })}
								</p>
								<div className={styles.historyCards}>
									{trick.cards.map((card) => (
										<CardFace
											key={`${trick.trickId}-${card.seatId}-${card.order}`}
											cardId={card.cardId}
											size="token"
										/>
									))}
								</div>
							</li>
						))}
					</ol>
				</section>
			) : null}
			<div className={styles.crewLineWrap}>
				{view.seats.map((seat) => (
					<SeatPip key={seat.region} seat={seat} compact params={params} />
				))}
			</div>
			{view.affordances.canRetry && onRetry ? (
				<div className={styles.boardActions}>
					<Button onPress={onRetry}>{t("retry")}</Button>
				</div>
			) : null}
		</div>
	);
}
