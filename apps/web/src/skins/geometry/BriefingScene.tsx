import type { TableView } from "@crew/view-model/fixtures";
import { useEffect, useState } from "react";
import { Button } from "../../components/ui/button.tsx";
import { useI18n } from "../../lib/i18n.tsx";
import { missionHeading, seatName } from "./copy.ts";
import playStyles from "./play.module.css";
import styles from "./scenes.module.css";

export function BriefingScene({
	view,
	onReady,
}: {
	view: TableView;
	onReady?: (ready: boolean) => void;
}) {
	const { t } = useI18n();
	const challengeKey = view.chrome.campaign?.challenge;
	const viewerSeat = view.seats.find((s) => s.seatId === view.viewerSeat) ?? view.seats[0];

	return (
		<div className={styles.logbook} data-scene="briefing">
			<p className={styles.kicker}>{t("logbook")}</p>
			<h1 className={styles.mission}>
				{view.chrome.campaign
					? t("missionHeading", { number: view.chrome.campaign.stepIndex + 1 })
					: missionHeading(view.chrome.missionId, t)}
			</h1>
			{view.chrome.difficulty !== null ? (
				<p className={styles.difficulty}>
					{t("difficultyValue", { difficulty: view.chrome.difficulty })}
				</p>
			) : null}
			{challengeKey ? (
				<p className={styles.lede}>{t(challengeKey)}</p>
			) : (
				<p className={styles.lede}>{t("briefing")}</p>
			)}
			<ul className={styles.crewLine}>
				{view.seats.map((seat) => (
					<li key={seat.region} data-region={seat.region} className="flex items-center gap-2">
						<span>{seatName(seat, t)}</span>
						<span
							className={
								seat.ready
									? "text-xs font-semibold tracking-wider text-primary uppercase"
									: "text-xs tracking-wider text-muted-foreground uppercase"
							}
						>
							{seat.ready ? t("ready") : t("unready")}
						</span>
					</li>
				))}
			</ul>
			{viewerSeat && onReady ? (
				<div className="mt-6 flex justify-center">
					<Button
						variant={viewerSeat.ready ? "outline" : "default"}
						onPress={() => onReady(!viewerSeat.ready)}
					>
						{viewerSeat.ready ? t("ready") : t("sitReady")}
					</Button>
				</div>
			) : null}
		</div>
	);
}

export function CampaignScene({ view }: { view?: TableView }) {
	const { t } = useI18n();
	const [now, setNow] = useState(Date.now());
	const story = view?.chrome.campaign?.story;
	const endsAt = story?.endsAt ?? 0;

	useEffect(() => {
		if (!endsAt || endsAt <= Date.now()) return;
		const interval = setInterval(() => {
			setNow(Date.now());
		}, 50);
		return () => clearInterval(interval);
	}, [endsAt]);

	const remaining = Math.max(0, endsAt - now);
	const percent = Math.min(100, Math.max(0, Math.round(((8000 - remaining) / 8000) * 100)));
	const text = story?.key ? t(story.key) : t("campaignEmpty");

	return (
		<div className={styles.logbook} data-scene="campaign">
			<p className={styles.kicker}>{t("campaign")}</p>
			<h1 className={styles.mission}>
				{view?.chrome.campaign?.stepIndex !== undefined
					? view.chrome.campaign.stepIndex >= view.chrome.campaign.stepCount
						? t("epilogue")
						: t("missionHeading", { number: view.chrome.campaign.stepIndex + 1 })
					: t("campaign")}
			</h1>
			<div className="my-6 max-w-prose text-center text-sm leading-relaxed tracking-wide text-foreground">
				<p className={styles.lede}>{text}</p>
			</div>
			{endsAt > 0 ? (
				<div className="my-4 w-full max-w-xs">
					<div
						className={playStyles.trickProgress}
						role="progressbar"
						aria-label={t("storyProgress")}
						aria-valuemin={0}
						aria-valuemax={100}
						aria-valuenow={percent}
					>
						<span style={{ transform: `scaleX(${percent / 100})` }} />
					</div>
				</div>
			) : null}
		</div>
	);
}
