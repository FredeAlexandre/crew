import type { TableView } from "@crew/view-model/fixtures";
import { useI18n } from "../../lib/i18n.tsx";
import { missionHeading, seatName } from "./copy.ts";
import styles from "./scenes.module.css";

export function BriefingScene({ view }: { view: TableView }) {
	const { t } = useI18n();
	return (
		<div className={styles.logbook} data-scene="briefing">
			<p className={styles.kicker}>{t("logbook")}</p>
			<h1 className={styles.mission}>{missionHeading(view.chrome.missionId)}</h1>
			{view.chrome.difficulty !== null ? (
				<p className={styles.difficulty}>Difficulty {view.chrome.difficulty}</p>
			) : null}
			<p className={styles.lede}>{t("briefing")}</p>
			<ul className={styles.crewLine}>
				{view.seats.map((seat) => (
					<li key={seat.region} data-region={seat.region}>
						{seatName(seat)}
					</li>
				))}
			</ul>
		</div>
	);
}

export function CampaignScene() {
	const { t } = useI18n();
	return (
		<div className={styles.logbook} data-scene="campaign">
			<p className={styles.kicker}>{t("logbook")}</p>
			<h1 className={styles.mission}>{t("campaign")}</h1>
			<p className={styles.lede}>{t("campaignEmpty")}</p>
		</div>
	);
}
