import { Link } from "@tanstack/react-router";
import {
	groupHistoryByDay,
	type HistoryEntry,
	localDayKey,
	missionNumber,
} from "../lib/history-group.ts";
import { type Locale, type Translate, useI18n } from "../lib/i18n.tsx";
import { cn } from "../lib/utils.ts";

export function PlayerHistory({ history }: { history: HistoryEntry[] }) {
	const { t, locale } = useI18n();
	const groups = groupHistoryByDay(history);
	return (
		<div className="grid gap-6">
			{groups.map((group) => (
				<section
					key={group.day}
					className="grid gap-3"
					aria-labelledby={`history-day-${group.day}`}
				>
					<h2
						id={`history-day-${group.day}`}
						className="m-0 text-xs font-semibold tracking-wide text-muted-foreground uppercase"
					>
						{dayHeading(group.day, locale, t)}
					</h2>
					<ul className="m-0 grid list-none gap-3 p-0">
						{group.entries.map((entry) => (
							<li key={entry.attemptId}>
								<Link
									to="/history/$attemptId"
									params={{ attemptId: entry.attemptId }}
									className={cn(
										"grid gap-2 border-2 border-foreground/25 bg-card p-4 text-inherit no-underline transition-colors",
										"hover:border-primary focus-visible:border-primary focus-visible:outline-none",
									)}
									aria-label={t("historyOpenReplay", {
										number: missionNumber(entry.missionId),
									})}
								>
									<div className="flex items-baseline justify-between gap-3">
										<span className="font-heading text-lg font-semibold tracking-wider uppercase">
											{t("mission", { number: missionNumber(entry.missionId) })}
										</span>
										<span className={entry.result === "won" ? "text-primary" : "text-destructive"}>
											{entry.result === "won" ? t("won") : t("missionFailed")}
										</span>
									</div>
									<div className="flex flex-wrap items-baseline justify-between gap-2 text-sm text-muted-foreground">
										<span>{t("historyPlayers", { count: entry.playerCount })}</span>
										<time className="tabular-nums" dateTime={entry.completedAt}>
											{formatTime(entry.completedAt, locale)}
										</time>
									</div>
								</Link>
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
