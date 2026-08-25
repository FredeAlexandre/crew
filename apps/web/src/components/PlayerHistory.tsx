import type { HistoryEntry } from "../lib/history.ts";
import { useI18n } from "../lib/i18n.tsx";
import styles from "../styles/identity.module.css";

export function PlayerHistory({ history, loading }: { history: HistoryEntry[]; loading: boolean }) {
	const { t } = useI18n();
	return (
		<section className={styles.history} aria-labelledby="player-history-title">
			<h2 id="player-history-title" className={styles.legend}>
				{t("missionHistory")}
			</h2>
			{loading ? <p className={styles.hint}>{t("loadingHistory")}</p> : null}
			{!loading && history.length === 0 ? <p className={styles.hint}>{t("historyEmpty")}</p> : null}
			{history.length > 0 ? (
				<ul className={styles.historyList}>
					{history.map((entry) => (
						<li key={entry.attemptId} className={styles.historyRow}>
							<span>{entry.missionId.replace(/^m/i, "")}</span>
							<span data-result={entry.result}>
								{entry.result === "won" ? t("won") : t("missionFailed")}
							</span>
							<time dateTime={entry.completedAt}>{formatDate(entry.completedAt)}</time>
						</li>
					))}
				</ul>
			) : null}
		</section>
	);
}

function formatDate(value: string): string {
	const date = new Date(value);
	return Number.isNaN(date.valueOf()) ? "" : date.toLocaleDateString();
}
