import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useIdentitySheet } from "../components/identity-sheet.tsx";
import { PlayerHistory } from "../components/PlayerHistory.tsx";
import { Button } from "../components/ui/button.tsx";
import { useIdentity } from "../hooks/use-identity.ts";
import { type HistoryEntry, readPlayerHistory } from "../lib/history.ts";
import { useI18n } from "../lib/i18n.tsx";

export const Route = createFileRoute("/history")({
	component: HistoryPage,
});

function HistoryPage() {
	const { t } = useI18n();
	const identity = useIdentity();
	const sheet = useIdentitySheet();
	const [history, setHistory] = useState<HistoryEntry[]>([]);
	const [loading, setLoading] = useState(false);
	const [failed, setFailed] = useState(false);
	const signedIn = identity.user?.isAnonymous === false;

	useEffect(() => {
		if (!signedIn) {
			setHistory([]);
			setLoading(false);
			setFailed(false);
			return;
		}
		let cancelled = false;
		setLoading(true);
		setFailed(false);
		void readPlayerHistory()
			.then((entries) => {
				if (!cancelled) {
					setHistory(entries);
				}
			})
			.catch(() => {
				if (!cancelled) {
					setHistory([]);
					setFailed(true);
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
	}, [identity.user?.id, signedIn]);

	return (
		<section className="mx-auto grid w-full max-w-[36rem] content-start gap-6 py-4 pb-10">
			<header className="grid gap-2 text-center">
				<h1 className="font-heading m-0 text-[clamp(1.75rem,6vw,2.5rem)] font-semibold tracking-wider uppercase">
					{t("history")}
				</h1>
				<p className="m-0 text-muted-foreground">{t("historyLede")}</p>
			</header>
			{!signedIn ? (
				<div className="grid justify-items-center gap-3 text-center">
					<p className="m-0 text-sm text-muted-foreground">{t("historySignInCopy")}</p>
					<div className="flex flex-wrap justify-center gap-2">
						<Button onPress={() => sheet.openCreateAccount()}>{t("createAccount")}</Button>
						<Button variant="outline" onPress={() => sheet.openSignIn()}>
							{t("signIn")}
						</Button>
					</div>
				</div>
			) : loading ? (
				<p className="m-0 text-center text-sm text-muted-foreground">{t("loadingHistory")}</p>
			) : failed ? (
				<p className="m-0 text-center text-sm text-muted-foreground">{t("historyFailed")}</p>
			) : history.length === 0 ? (
				<p className="m-0 text-center text-sm text-muted-foreground">{t("historyEmpty")}</p>
			) : (
				<PlayerHistory history={history} />
			)}
			<Link
				className="inline-flex min-h-11 items-center justify-self-center text-muted-foreground no-underline hover:text-primary"
				to="/"
			>
				{t("back")}
			</Link>
		</section>
	);
}
