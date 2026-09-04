import { isRoomCode } from "@crew/protocol";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { TextField } from "react-aria-components";
import { useDisplayName } from "../hooks/use-display-name.ts";
import { useI18n } from "../lib/i18n.tsx";
import { extractLobbyCode } from "../lib/lobby-code.ts";
import { joinRoom, roomErrorCopy } from "../lib/rooms.ts";
import { cn } from "../lib/utils.ts";
import { CrewMark } from "./CrewMark.tsx";
import styles from "./home.module.css";
import { Alert, AlertDescription } from "./ui/alert.tsx";
import { Button } from "./ui/button.tsx";
import { Field, FieldLabel } from "./ui/field.tsx";
import { Input } from "./ui/input.tsx";

export function HomeLanding() {
	const navigate = useNavigate();
	const displayName = useDisplayName();
	const { t } = useI18n();
	const [code, setCode] = useState("");
	const [joinOpen, setJoinOpen] = useState(false);
	const [busy, setBusy] = useState<"idle" | "join">("idle");
	const [error, setError] = useState<string | null>(null);
	const blocked = busy !== "idle";

	function play() {
		void navigate({ to: "/play" });
	}

	async function join() {
		if (!joinOpen) {
			setJoinOpen(true);
			setError(null);
			return;
		}
		const normalized = extractLobbyCode(code);
		if (!isRoomCode(normalized)) {
			setError(t("invalidLobbyCode"));
			return;
		}
		setBusy("join");
		setError(null);
		try {
			await displayName.flush();
			const ticket = await joinRoom(normalized);
			await navigate({ to: "/lobby/$code", params: { code: ticket.code } });
		} catch (caught) {
			setError(roomErrorCopy(caught, t));
			setBusy("idle");
		}
	}

	return (
		<section className={styles.stage}>
			<div className={styles.backdrop} aria-hidden="true" />
			<h1 className="sr-only">{t("siteTitle")}</h1>
			<div className={styles.layer}>
				<CrewMark />
			</div>
			<div className={styles.actions}>
				<Button
					className="h-12 w-full text-sm tracking-[0.28em]"
					isDisabled={blocked}
					onPress={() => void play()}
				>
					{t("play")}
				</Button>
				{joinOpen ? (
					<TextField
						className={styles.codeField}
						value={code}
						onChange={(value: string) => setCode(extractLobbyCode(value))}
						isDisabled={blocked}
					>
						<Field>
							<FieldLabel className="sr-only">{t("lobbyCode")}</FieldLabel>
							<Input
								placeholder="CODE"
								autoComplete="off"
								autoCapitalize="characters"
								spellCheck="false"
								autoFocus
								className="uppercase tracking-[0.22em]"
							/>
						</Field>
					</TextField>
				) : null}
				<Button
					className="h-12 w-full text-sm tracking-[0.28em]"
					isDisabled={blocked}
					onPress={() => void join()}
					variant="outline"
				>
					{busy === "join" ? "…" : t("join")}
				</Button>
				<Button
					className="h-12 w-full text-sm tracking-[0.28em]"
					isDisabled={blocked}
					onPress={() => void navigate({ to: "/history" })}
					variant="outline"
				>
					{t("history")}
				</Button>
			</div>
			{error ? (
				<Alert variant="destructive" className={cn(styles.error, "text-center")}>
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			) : null}
		</section>
	);
}
