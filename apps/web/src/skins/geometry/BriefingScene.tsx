import type { TableView } from "@crew/view-model/fixtures";
import { Button } from "react-aria-components";
import { missionHeading, seatName } from "./copy.ts";
import styles from "./scenes.module.css";

export function BriefingScene({ view, onConfirm }: { view: TableView; onConfirm?: () => void }) {
	return (
		<div className={styles.logbook} data-scene="briefing">
			<p className={styles.kicker}>Logbook</p>
			<h1 className={styles.mission}>{missionHeading(view.chrome.missionId)}</h1>
			{view.chrome.difficulty !== null ? (
				<p className={styles.difficulty}>Difficulty {view.chrome.difficulty}</p>
			) : null}
			<p className={styles.lede}>Read the mission. Confirm when the table is ready to deal.</p>
			<ul className={styles.crewLine}>
				{view.seats.map((seat) => (
					<li key={seat.region} data-region={seat.region}>
						{seatName(seat)}
					</li>
				))}
			</ul>
			{onConfirm ? (
				<Button className={styles.primary} onPress={onConfirm}>
					Deal
				</Button>
			) : null}
		</div>
	);
}

export function CampaignScene() {
	return (
		<div className={styles.logbook} data-scene="campaign">
			<p className={styles.kicker}>Logbook</p>
			<h1 className={styles.mission}>Campaign</h1>
			<p className={styles.lede}>Completed missions will be listed here.</p>
		</div>
	);
}
