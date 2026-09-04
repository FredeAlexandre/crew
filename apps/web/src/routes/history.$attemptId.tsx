import { buildReplay, frameIndexAt } from "@crew/view-model/replay";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useIdentitySheet } from "../components/identity-sheet.tsx";
import { ReplayControls } from "../components/ReplayControls.tsx";
import { Button } from "../components/ui/button.tsx";
import { useIdentity } from "../hooks/use-identity.ts";
import { useReplayClock } from "../hooks/use-replay-clock.ts";
import { type HistoryGame, readPlayerGame } from "../lib/history.ts";
import { useI18n } from "../lib/i18n.tsx";
import { GeometryTable } from "../skins/geometry/Table.tsx";

export const Route = createFileRoute("/history/$attemptId")({
	component: ReplayPage,
});

function ReplayPage() {
	const { t } = useI18n();
	const { attemptId } = Route.useParams();
	const identity = useIdentity();
	const sheet = useIdentitySheet();
	const signedIn = identity.user?.isAnonymous === false;
	const [game, setGame] = useState<HistoryGame | null>(null);
	const [loading, setLoading] = useState(false);
	const [failed, setFailed] = useState<"load" | "empty" | null>(null);

	useEffect(() => {
		if (!signedIn) {
			setGame(null);
			setLoading(false);
			setFailed(null);
			return;
		}
		let cancelled = false;
		setLoading(true);
		setFailed(null);
		void readPlayerGame(attemptId)
			.then((next) => {
				if (cancelled) {
					return;
				}
				if (next.facts.length === 0) {
					setGame(next);
					setFailed("empty");
					return;
				}
				setGame(next);
			})
			.catch(() => {
				if (!cancelled) {
					setGame(null);
					setFailed("load");
				}
			})
			.finally(() => {
				if (!cancelled) {
					setLoading(false);
				}
			});
		return () => {
			cancelled = true;
		};
	}, [attemptId, identity.user?.id, signedIn]);

	const viewerSeat = useMemo(() => {
		if (game === null || identity.user === null) {
			return 0;
		}
		const match = game.participants.find(
			(participant) => participant.playerId === identity.user?.id,
		);
		return match?.seatId ?? 0;
	}, [game, identity.user]);

	const timeline = useMemo(() => {
		if (game === null || failed === "empty") {
			return null;
		}
		return buildReplay({
			facts: game.facts,
			participants: game.participants,
			setup: { ...game.setup, completedTricksVisible: true },
			viewerSeat,
			playerCount: game.playerCount,
			attemptId: game.attemptId,
		});
	}, [failed, game, viewerSeat]);

	const clock = useReplayClock(timeline?.totalMs ?? 0, true);
	const frame =
		timeline === null ? undefined : timeline.frames[frameIndexAt(timeline.frames, clock.timeMs)];

	useEffect(() => {
		function onKey(event: KeyboardEvent) {
			if (event.code !== "Space" || event.target instanceof HTMLInputElement) {
				return;
			}
			event.preventDefault();
			clock.togglePlay();
		}
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [clock.togglePlay]);

	if (!signedIn) {
		return (
			<section className="mx-auto grid w-full max-w-[36rem] content-start gap-6 py-4 pb-10">
				<header className="grid gap-2 text-center">
					<h1 className="font-heading m-0 text-[clamp(1.75rem,6vw,2.5rem)] font-semibold tracking-wider uppercase">
						{t("replay")}
					</h1>
					<p className="m-0 text-sm text-muted-foreground">{t("historySignInCopy")}</p>
				</header>
				<div className="flex flex-wrap justify-center gap-2">
					<Button onPress={() => sheet.openCreateAccount()}>{t("createAccount")}</Button>
					<Button variant="outline" onPress={() => sheet.openSignIn()}>
						{t("signIn")}
					</Button>
				</div>
				<Link
					className="inline-flex min-h-11 items-center justify-self-center text-muted-foreground no-underline hover:text-primary"
					to="/history"
				>
					{t("back")}
				</Link>
			</section>
		);
	}

	if (loading || timeline === null || frame === undefined) {
		return (
			<section className="mx-auto grid w-full max-w-[36rem] content-start gap-6 py-4 pb-10">
				<p className="m-0 text-center text-sm text-muted-foreground">
					{failed === "load"
						? t("replayFailed")
						: failed === "empty"
							? t("replayEmpty")
							: t("loadingHistory")}
				</p>
				<Link
					className="inline-flex min-h-11 items-center justify-self-center text-muted-foreground no-underline hover:text-primary"
					to="/history"
				>
					{t("back")}
				</Link>
			</section>
		);
	}

	return (
		<section className="relative grid h-full min-h-0 min-w-0 max-w-full">
			<ReplayControls
				totalMs={timeline.totalMs}
				timeMs={clock.timeMs}
				playing={clock.playing}
				speed={clock.speed}
				checkpoints={timeline.checkpoints}
				onSeek={clock.seek}
				onTogglePlay={clock.togglePlay}
				onSpeed={clock.setSpeed}
			/>
			<div className="grid h-full min-h-0 min-w-0 max-w-full pt-[5.75rem]">
				<GeometryTable view={frame.view} replay />
			</div>
		</section>
	);
}
