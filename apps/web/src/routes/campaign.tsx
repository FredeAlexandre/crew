import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CrewMark } from "../components/CrewMark.tsx";
import styles from "../components/home.module.css";
import { Alert, AlertDescription } from "../components/ui/alert.tsx";
import { Button, buttonVariants } from "../components/ui/button.tsx";
import { useDisplayName } from "../hooks/use-display-name.ts";
import { type CampaignSummary, readPlayerCampaigns } from "../lib/campaigns.ts";
import { useI18n } from "../lib/i18n.tsx";
import { createRoom, roomErrorCopy } from "../lib/rooms.ts";
import { cn } from "../lib/utils.ts";

export const Route = createFileRoute("/campaign")({
	component: CampaignRoute,
});

const DEFAULT_PLAYER_COUNT = 4;

function CampaignRoute() {
	const navigate = useNavigate();
	const displayName = useDisplayName();
	const { t } = useI18n();
	const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
	const [isGuest, setIsGuest] = useState(false);
	const [loading, setLoading] = useState(true);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		void readPlayerCampaigns()
			.then((res) => {
				if (!cancelled) {
					setCampaigns(res.campaigns);
					setIsGuest(res.isGuest);
					setLoading(false);
				}
			})
			.catch(() => {
				if (!cancelled) {
					setLoading(false);
				}
			});
		return () => {
			cancelled = true;
		};
	}, []);

	async function startNewCampaign() {
		setBusy(true);
		setError(null);
		try {
			await displayName.flush();
			const ticket = await createRoom(DEFAULT_PLAYER_COUNT, "campaign");
			await navigate({ to: "/lobby/$code", params: { code: ticket.code } });
		} catch (caught) {
			setError(roomErrorCopy(caught, t));
			setBusy(false);
		}
	}

	return (
		<section className={styles.stage}>
			<div className={styles.backdrop} aria-hidden="true" />
			<h1 className="sr-only">{t("campaign")}</h1>
			<div className={styles.layer}>
				<CrewMark />
			</div>

			<div className="relative z-1 my-4 flex w-full max-w-md flex-1 flex-col items-center gap-3 overflow-y-auto px-2">
				<h2 className="text-sm font-semibold tracking-[0.2em] text-foreground uppercase">
					{t("campaign")}
				</h2>

				<div className="w-full">
					{loading ? (
						<p className="text-center text-xs tracking-wider text-muted-foreground">
							{t("loadingCampaigns")}
						</p>
					) : isGuest ? (
						<p className="text-center text-xs tracking-wider text-muted-foreground">
							{t("campaignGuestHint")}
						</p>
					) : campaigns.length === 0 ? (
						<p className="text-center text-xs tracking-wider text-muted-foreground">
							{t("campaignsEmpty")}
						</p>
					) : (
						<ul className="grid w-full gap-2">
							{campaigns.map((camp) => (
								<li
									key={camp.id}
									className="flex flex-col gap-1 rounded border border-border/60 bg-background/50 p-3 text-xs"
								>
									<div className="flex items-center justify-between">
										<span className="font-semibold text-foreground">{t("deepSeaLogbook")}</span>
										<span
											className={
												camp.status === "completed"
													? "font-semibold text-primary"
													: "text-muted-foreground"
											}
										>
											{camp.status === "completed"
												? t("completed")
												: `${t("missionHeading", { number: camp.stepIndex + 1 })} / ${camp.stepCount}`}
										</span>
									</div>
									<div className="flex items-center justify-between text-muted-foreground">
										<span>
											{t("crew")}: {camp.crew.join(", ") || t("crew")}
										</span>
										<span>{t("attemptsTotal", { count: camp.attemptTotals })}</span>
									</div>
								</li>
							))}
						</ul>
					)}
				</div>
			</div>

			<div className={styles.actions}>
				<Button
					className={cn(
						styles.choice,
						"flex h-auto w-full flex-col whitespace-normal text-sm tracking-[0.28em]",
					)}
					isDisabled={busy}
					onPress={() => void startNewCampaign()}
				>
					{busy ? "…" : t("newCampaign")}
				</Button>
				<Link
					className={cn(
						buttonVariants({ variant: "ghost" }),
						"h-12 w-full text-sm tracking-[0.28em] no-underline",
					)}
					to="/play"
				>
					{t("back")}
				</Link>
			</div>
			{error ? (
				<Alert variant="destructive" className={cn(styles.error, "text-center")}>
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			) : null}
		</section>
	);
}
