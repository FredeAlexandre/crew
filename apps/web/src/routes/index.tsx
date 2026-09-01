import { isRoomCode, PLAYER_COUNTS, type PlayerCount } from "@crew/protocol";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { TextField } from "react-aria-components";
import { useIdentitySheet } from "../components/identity-sheet.tsx";
import { Alert, AlertDescription } from "../components/ui/alert.tsx";
import { Button } from "../components/ui/button.tsx";
import { Card, CardContent, CardDescription, CardHeader } from "../components/ui/card.tsx";
import { Field, FieldLabel } from "../components/ui/field.tsx";
import { Input } from "../components/ui/input.tsx";
import { ToggleGroup, ToggleGroupItem } from "../components/ui/toggle-group.tsx";
import { useDisplayName } from "../hooks/use-display-name.ts";
import { useIdentity } from "../hooks/use-identity.ts";
import { DISPLAY_NAME_MAX } from "../lib/display-name.ts";
import { useI18n } from "../lib/i18n.tsx";
import { extractLobbyCode } from "../lib/lobby-code.ts";
import { createRoom, joinRoom, roomErrorCopy } from "../lib/rooms.ts";

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
		<section className="@container grid w-full justify-items-center gap-5 px-0 pt-3 pb-6 sm:min-h-full sm:content-center sm:gap-7 sm:pt-6 sm:pb-8">
			<header className="grid justify-items-center gap-1.5 text-center">
				<h1 className="font-heading m-0 text-[clamp(1.75rem,4vw,2.5rem)] font-semibold tracking-wider uppercase">
					Crew
				</h1>
				<p className="m-0 text-muted-foreground">{t("openTable")}</p>
				<nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1">
					<Link
						className="inline-flex min-h-11 items-center text-muted-foreground no-underline hover:text-primary"
						to="/assets"
					>
						{t("browseAssets")}
					</Link>
					{identity.user?.isAnonymous !== false ? (
						<Button variant="ghost" className="text-muted-foreground" onPress={sheet.openSignIn}>
							{t("signIn")}
						</Button>
					) : null}
				</nav>
			</header>
			<div className="grid w-full max-w-[52rem] gap-5">
				<TextField
					className="w-full max-w-96 justify-self-center"
					value={displayName.name}
					onChange={displayName.onChange}
					isDisabled={blocked || !displayName.ready}
				>
					<Field>
						<FieldLabel>{t("name")}</FieldLabel>
						<Input
							placeholder={t("yourName")}
							autoComplete="nickname"
							maxLength={DISPLAY_NAME_MAX}
							spellCheck="false"
						/>
					</Field>
				</TextField>
				<div className="@min-[36rem]:grid-cols-2 grid grid-cols-1 items-stretch gap-4 @min-[36rem]:gap-0">
					<form
						className="@min-[36rem]:px-7 grid content-start gap-3 p-5 @min-[36rem]:py-6"
						onSubmit={(event) => {
							event.preventDefault();
							void openTable();
						}}
					>
						<Card className="bg-transparent py-0 shadow-none ring-0">
							<CardHeader className="px-0">
								<h2 className="font-heading m-0 text-base font-semibold tracking-wider uppercase">
									{t("createLobby")}
								</h2>
								<CardDescription>{t("openTable")}</CardDescription>
							</CardHeader>
							<CardContent className="grid gap-3 px-0">
								<Field>
									<FieldLabel>{t("players")}</FieldLabel>
									<ToggleGroup
										selectionMode="single"
										disallowEmptySelection
										isDisabled={blocked}
										selectedKeys={new Set([String(playerCount)])}
										onSelectionChange={(keys) => {
											const [value] = keys;
											const next = Number(value);
											if (next === 3 || next === 4 || next === 5) {
												setPlayerCount(next);
											}
										}}
										aria-label={t("players")}
									>
										{PLAYER_COUNTS.map((count) => (
											<ToggleGroupItem key={count} id={String(count)}>
												{count}
											</ToggleGroupItem>
										))}
									</ToggleGroup>
								</Field>
								<Button type="submit" isDisabled={blocked}>
									{busy === "create" ? "…" : t("create")}
								</Button>
							</CardContent>
						</Card>
					</form>
					<form
						className="@min-[36rem]:border-l @min-[36rem]:border-border/40 @min-[36rem]:px-7 grid content-start gap-3 p-5 @min-[36rem]:py-6"
						onSubmit={(event) => {
							event.preventDefault();
							void sitDown();
						}}
					>
						<Card className="bg-transparent py-0 shadow-none ring-0">
							<CardHeader className="px-0">
								<h2 className="font-heading m-0 text-base font-semibold tracking-wider uppercase">
									{t("joinLobby")}
								</h2>
								<CardDescription>{t("pasteCode")}</CardDescription>
							</CardHeader>
							<CardContent className="grid gap-3 px-0">
								<TextField
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
											className="uppercase tracking-[0.18em]"
										/>
									</Field>
								</TextField>
								<Button type="submit" isDisabled={blocked || !isRoomCode(code)}>
									{busy === "join" ? "…" : t("join")}
								</Button>
							</CardContent>
						</Card>
					</form>
				</div>
			</div>
			{shownError ? (
				<Alert variant="destructive" className="max-w-xl text-center">
					<AlertDescription>{shownError}</AlertDescription>
				</Alert>
			) : null}
		</section>
	);
}
