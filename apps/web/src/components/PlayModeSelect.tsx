import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useDisplayName } from "../hooks/use-display-name.ts";
import { useI18n } from "../lib/i18n.tsx";
import { createRoom, roomErrorCopy } from "../lib/rooms.ts";
import { cn } from "../lib/utils.ts";
import { CrewMark } from "./CrewMark.tsx";
import styles from "./home.module.css";
import { Alert, AlertDescription } from "./ui/alert.tsx";
import { Button, buttonVariants } from "./ui/button.tsx";

const DEFAULT_PLAYER_COUNT = 4;

export function PlayModeSelect() {
	const navigate = useNavigate();
	const displayName = useDisplayName();
	const { t } = useI18n();
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function freePlay() {
		setBusy(true);
		setError(null);
		try {
			await displayName.flush();
			const ticket = await createRoom(DEFAULT_PLAYER_COUNT);
			await navigate({ to: "/lobby/$code", params: { code: ticket.code } });
		} catch (caught) {
			setError(roomErrorCopy(caught, t));
			setBusy(false);
		}
	}

	return (
		<section className={styles.stage}>
			<div className={styles.backdrop} aria-hidden="true" />
			<h1 className="sr-only">{t("chooseMode")}</h1>
			<div className={styles.layer}>
				<CrewMark />
			</div>
			<div className={styles.actions}>
				<Button
					className={cn(
						styles.choice,
						"flex h-auto w-full flex-col whitespace-normal text-sm tracking-[0.28em]",
					)}
					isDisabled
					variant="outline"
				>
					<span>{t("campaign")}</span>
					<span className={styles.choiceHint}>{t("comingSoon")}</span>
				</Button>
				<Button
					className={cn(
						styles.choice,
						"flex h-auto w-full flex-col whitespace-normal text-sm tracking-[0.28em]",
					)}
					isDisabled={busy}
					onPress={() => void freePlay()}
				>
					{busy ? "…" : t("freePlay")}
				</Button>
				<Link
					className={cn(
						buttonVariants({ variant: "ghost" }),
						"h-12 w-full text-sm tracking-[0.28em] no-underline",
					)}
					to="/"
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
