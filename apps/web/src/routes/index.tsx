import { isRoomCode, normalizeRoomCode, PLAYER_COUNTS, type PlayerCount } from "@crew/protocol";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button, Input, Label, Radio, RadioGroup, TextField } from "react-aria-components";
import { useIdentitySheet } from "../components/identity-sheet.tsx";
import { useDisplayName } from "../hooks/use-display-name.ts";
import { useIdentity } from "../hooks/use-identity.ts";
import { DISPLAY_NAME_MAX } from "../lib/display-name.ts";
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

	async function openTable() {
		setBusy("create");
		setError(null);
		try {
			await displayName.flush();
			const ticket = await createRoom(playerCount);
			await navigate({ to: "/lobby/$code", params: { code: ticket.code } });
		} catch (caught) {
			setError(roomErrorCopy(caught));
			setBusy("idle");
		}
	}

	async function sitDown() {
		const normalized = normalizeRoomCode(code);
		if (!isRoomCode(normalized)) {
			setError("Enter the 4–6 character code from your host.");
			return;
		}
		setBusy("join");
		setError(null);
		try {
			await displayName.flush();
			const ticket = await joinRoom(normalized);
			await navigate({ to: "/lobby/$code", params: { code: ticket.code } });
		} catch (caught) {
			setError(roomErrorCopy(caught));
			setBusy("idle");
		}
	}

	const blocked = busy !== "idle";
	const shownError = error ?? displayName.sessionError;

	return (
		<section className={styles.table}>
			<header className={styles.masthead}>
				<h1 className={styles.title}>Crew</h1>
				<p className={styles.lede}>Sit at a table. Three to five players.</p>
				{identity.user?.isAnonymous !== false ? (
					<Button className={styles.signIn} onPress={sheet.openSignIn}>
						Sign in
					</Button>
				) : null}
			</header>
			<TextField
				className={styles.identity}
				value={displayName.name}
				onChange={displayName.onChange}
				isDisabled={blocked || !displayName.ready}
			>
				<Label className={styles.fieldLabel}>Name</Label>
				<Input
					className={styles.nameInput}
					placeholder="Your name"
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
					<h2 className={styles.choiceTitle}>Create a lobby</h2>
					<p className={styles.choiceCopy}>Open a table and share the code.</p>
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
						<Label className={styles.fieldLabel}>Players</Label>
						{PLAYER_COUNTS.map((count) => (
							<Radio key={count} className={styles.count} value={String(count)}>
								{count}
							</Radio>
						))}
					</RadioGroup>
					<Button className={styles.action} type="submit" isDisabled={blocked}>
						{busy === "create" ? "Opening…" : "Create lobby"}
					</Button>
				</form>
				<form
					className={styles.choice}
					onSubmit={(event) => {
						event.preventDefault();
						void sitDown();
					}}
				>
					<h2 className={styles.choiceTitle}>Join a lobby</h2>
					<p className={styles.choiceCopy}>Enter the code from your host.</p>
					<TextField
						aria-label="Lobby code"
						value={code}
						onChange={(value: string) => setCode(normalizeRoomCode(value))}
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
					<Button className={styles.action} type="submit" isDisabled={blocked || !isRoomCode(code)}>
						{busy === "join" ? "Joining…" : "Join lobby"}
					</Button>
				</form>
			</div>
			{shownError ? (
				<p className={styles.error} role="alert">
					{shownError}
				</p>
			) : null}
		</section>
	);
}
