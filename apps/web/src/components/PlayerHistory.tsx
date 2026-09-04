import {
	groupHistoryByDay,
	type HistoryEntry,
	localDayKey,
	missionNumber,
} from "../lib/history-group.ts";
import { type Locale, type Translate, useI18n } from "../lib/i18n.tsx";

export function PlayerHistory({ history }: { history: HistoryEntry[] }) {
	const { t, locale } = useI18n();
	const groups = groupHistoryByDay(history);
	return (
		<div className="grid gap-6">
			{groups.map((group) => (
				<section
					key={group.day}
					className="grid gap-2"
					aria-labelledby={`history-day-${group.day}`}
				>
					<h2
						id={`history-day-${group.day}`}
						className="m-0 text-xs font-semibold tracking-wide text-muted-foreground uppercase"
					>
						{dayHeading(group.day, locale, t)}
					</h2>
					<ul className="m-0 grid list-none p-0">
						{group.entries.map((entry) => (
							<li
								key={entry.attemptId}
								className="grid grid-cols-[1fr_auto_auto] items-baseline gap-3 border-b border-border/70 py-2.5 text-sm last:border-0"
							>
								<span>{t("mission", { number: missionNumber(entry.missionId) })}</span>
								<span className={entry.result === "won" ? "text-primary" : "text-destructive"}>
									{entry.result === "won" ? t("won") : t("missionFailed")}
								</span>
								<time className="text-muted-foreground tabular-nums" dateTime={entry.completedAt}>
									{formatTime(entry.completedAt, locale)}
								</time>
							</li>
						))}
					</ul>
				</section>
			))}
		</div>
	);
}

function dayHeading(day: string, locale: Locale, t: Translate): string {
	const now = new Date();
	const today = localDayKey(now);
	const yesterday = localDayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
	if (day === today) {
		return t("historyToday");
	}
	if (day === yesterday) {
		return t("historyYesterday");
	}
	const [year, month, date] = day.split("-").map(Number);
	return new Date(year, month - 1, date).toLocaleDateString(locale, {
		weekday: "long",
		day: "numeric",
		month: "long",
		year: "numeric",
	});
}

function formatTime(value: string, locale: Locale): string {
	const date = new Date(value);
	return Number.isNaN(date.valueOf())
		? ""
		: date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
}
