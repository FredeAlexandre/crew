import type { HistoryEntry } from "../lib/history.ts";
import { useI18n } from "../lib/i18n.tsx";

export function PlayerHistory({ history, loading }: { history: HistoryEntry[]; loading: boolean }) {
	const { t } = useI18n();
	return (
		<section
			className="mt-1 grid gap-1.5 border-t border-border pt-2.5"
			aria-labelledby="player-history-title"
		>
			<h2
				id="player-history-title"
				className="m-0 text-xs font-semibold tracking-wide text-muted-foreground uppercase"
			>
				{t("missionHistory")}
			</h2>
			{loading ? <p className="m-0 text-sm text-muted-foreground">{t("loadingHistory")}</p> : null}
			{!loading && history.length === 0 ? (
				<p className="m-0 text-sm text-muted-foreground">{t("historyEmpty")}</p>
			) : null}
			{history.length > 0 ? (
				<ul className="m-0 grid list-none gap-1 p-0">
					{history.map((entry) => (
						<li key={entry.attemptId} className="grid grid-cols-[1fr_auto_auto] gap-2 text-sm">
							<span>{entry.missionId.replace(/^m/i, "")}</span>
							<span className={entry.result === "won" ? "text-primary" : undefined}>
								{entry.result === "won" ? t("won") : t("missionFailed")}
							</span>
							<time className="text-muted-foreground" dateTime={entry.completedAt}>
								{formatDate(entry.completedAt)}
							</time>
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
