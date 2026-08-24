import { isRoomCode, PLAYER_COUNTS, type PlayerCount } from "@crew/protocol";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button, Input, Label, Radio, RadioGroup, TextField } from "react-aria-components";
import { useIdentitySheet } from "../components/identity-sheet.tsx";
import { useDisplayName } from "../hooks/use-display-name.ts";
import { useIdentity } from "../hooks/use-identity.ts";
import { DISPLAY_NAME_MAX } from "../lib/display-name.ts";
import { useI18n } from "../lib/i18n.tsx";
import { extractLobbyCode } from "../lib/lobby-code.ts";
import { createRoom, joinRoom, roomErrorCopy } from "../lib/rooms.ts";
import styles from "../styles/boot.module.css";

export const Route = createFileRoute("/")({
	component: BootRoute,
});

function BootRoute() {
	const navigate = useNavigate();
	const [playerCount, setPlayerCount] = useState<PlayerCount>(4);
	const [code, setCode] = useState("");
	const [busy, setBusy] = useState<"idle" | "create" | "join">("idle");
	const [error, setError] = useState<string | null>(null);
	const displayName = useDisplayName();
	const identity = useIdentity();
	const sheet = useIdentitySheet();
	const { t } = useI18n();

	async function openTable() {
		setBusy("create");
		setError(null);
		try {
			await displayName.flush();
			const ticket = await createRoom(playerCount);
			await navigate({ to: "/lobby/$code", params: { code: ticket.code } });
		} catch (caught) {
			setError(roomErrorCopy(caught, t));
			setBusy("idle");
		}
	}

	async function sitDown() {
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

	const blocked = busy !== "idle";
	const shownError = error ?? displayName.sessionError;

	return (
		<section className={styles.table}>
			<header className={styles.masthead}>
				<h1 className={styles.title}>Crew</h1>
				<p className={styles.lede}>{t("openTable")}</p>
				<nav className={styles.links}>
					<Link className={styles.catalogLink} to="/assets">
						{t("browseAssets")}
					</Link>
					{identity.user?.isAnonymous !== false ? (
						<Button className={styles.signIn} onPress={sheet.openSignIn}>
							{t("signIn")}
						</Button>
					) : null}
				</nav>
			</header>
			<div className={styles.board}>
				<TextField
					className={styles.identity}
					value={displayName.name}
					onChange={displayName.onChange}
					isDisabled={blocked || !displayName.ready}
				>
					<Label className={styles.fieldLabel}>{t("name")}</Label>
					<Input
						className={styles.nameInput}
						placeholder={t("yourName")}
						autoComplete="nickname"
						maxLength={DISPLAY_NAME_MAX}
						spellCheck="false"
					/>
				</TextField>
				<div className={styles.choices}>
					<form
						className={styles.choice}
						onSubmit={(event) => {
							event.preventDefault();
							void openTable();
						}}
					>
						<h2 className={styles.choiceTitle}>{t("createLobby")}</h2>
						<p className={styles.choiceCopy}>{t("openTable")}</p>
						<RadioGroup
							className={styles.counts}
							value={String(playerCount)}
							orientation="horizontal"
							onChange={(value: string) => {
								const next = Number(value);
								if (next === 3 || next === 4 || next === 5) {
									setPlayerCount(next);
								}
							}}
							isDisabled={blocked}
						>
							<Label className={styles.fieldLabel}>{t("players")}</Label>
							{PLAYER_COUNTS.map((count) => (
								<Radio key={count} className={styles.count} value={String(count)}>
									{count}
								</Radio>
							))}
						</RadioGroup>
						<Button className={styles.action} type="submit" isDisabled={blocked}>
							{busy === "create" ? "…" : t("create")}
						</Button>
					</form>
					<form
						className={styles.choice}
						onSubmit={(event) => {
							event.preventDefault();
							void sitDown();
						}}
					>
						<h2 className={styles.choiceTitle}>{t("joinLobby")}</h2>
						<p className={styles.choiceCopy}>{t("pasteCode")}</p>
						<TextField
							aria-label={t("lobbyCode")}
							value={code}
							onChange={(value: string) => setCode(extractLobbyCode(value))}
							isDisabled={blocked}
						>
							<Input
								className={styles.codeInput}
								placeholder="CODE"
								autoComplete="off"
								autoCapitalize="characters"
								spellCheck="false"
							/>
						</TextField>
						<Button
							className={styles.action}
							type="submit"
							isDisabled={blocked || !isRoomCode(code)}
						>
							{busy === "join" ? "…" : t("join")}
						</Button>
					</form>
				</div>
			</div>
			{shownError ? (
				<p className={styles.error} role="alert">
					{shownError}
				</p>
			) : null}
		</section>
	);
}
