import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { TextField } from "react-aria-components";
import { useIdentity } from "../hooks/use-identity.ts";
import {
	accountErrorCopy,
	changeAccountPassword,
	convertAnonymousAccount,
	MAX_PASSWORD_LENGTH,
	MIN_PASSWORD_LENGTH,
	signInAccount,
	signOutAccount,
} from "../lib/account.ts";
import { identiconUrl } from "../lib/avatar.ts";
import {
	createDebouncedAction,
	DISPLAY_NAME_DEBOUNCE_MS,
	DISPLAY_NAME_MAX,
} from "../lib/display-name.ts";
import { type HistoryEntry, readPlayerHistory } from "../lib/history.ts";
import { type Translate, useI18n } from "../lib/i18n.tsx";
import { persistDisplayName } from "../lib/rooms.ts";
import { useIdentitySheet } from "./identity-sheet.tsx";
import { PlayerHistory } from "./PlayerHistory.tsx";
import { Alert, AlertDescription } from "./ui/alert.tsx";
import { Button } from "./ui/button.tsx";
import {
	Dialog,
	DialogClose,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "./ui/dialog.tsx";
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldSet,
} from "./ui/field.tsx";
import { Input } from "./ui/input.tsx";
import { Separator } from "./ui/separator.tsx";

type SheetMode = "home" | "create" | "signin" | "password";

export function ProfileControl() {
	const { t } = useI18n();
	const sheet = useIdentitySheet();
	const identity = useIdentity();
	const refetchRef = useRef(identity.refetch);
	const [mode, setMode] = useState<SheetMode>("home");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [history, setHistory] = useState<HistoryEntry[]>([]);
	const [historyLoading, setHistoryLoading] = useState(false);
	const [nameSaver] = useState(() =>
		createDebouncedAction(async (value) => {
			await persistDisplayName(value);
			await refetchRef.current();
		}, DISPLAY_NAME_DEBOUNCE_MS),
	);
	refetchRef.current = identity.refetch;

	const [open, setOpen] = useState(false);
	useEffect(() => {
		if (!open || identity.user?.isAnonymous !== false) {
			return;
		}
		setHistoryLoading(true);
		void readPlayerHistory()
			.then(setHistory)
			.catch(() => setHistory([]))
			.finally(() => setHistoryLoading(false));
	}, [open, identity.user?.id, identity.user?.isAnonymous]);
	const skipHomeResetRef = useRef(false);
	const user = identity.user;
	const isAnonymous = user?.isAnonymous !== false;
	const shownError = error ?? identity.sessionError;
	const openLabel = isAnonymous
		? identity.displayName.length > 0
			? t("guestProfileNamed", { name: identity.displayName })
			: t("guestProfile")
		: identity.displayName.length > 0
			? t("profileNamed", { name: identity.displayName })
			: t("yourProfile");

	function resetSheet(nextName: string, nextMode: SheetMode = "home") {
		setMode(nextMode);
		setBusy(false);
		setError(null);
		setName(nextName);
		setEmail("");
		setPassword("");
		setCurrentPassword("");
		setNewPassword("");
	}

	useEffect(() => {
		if (sheet.intent === null) {
			return;
		}
		skipHomeResetRef.current = true;
		resetSheet(identity.displayName, sheet.intent);
		setOpen(true);
		sheet.clearIntent();
	}, [sheet.intent, sheet.clearIntent, identity.displayName]);

	async function run(action: () => Promise<void>) {
		setBusy(true);
		setError(null);
		try {
			await action();
			await identity.refetch();
			setMode("home");
			setPassword("");
			setCurrentPassword("");
			setNewPassword("");
		} catch (caught) {
			setError(accountErrorCopy(caught));
		} finally {
			setBusy(false);
		}
	}

	return (
		<DialogTrigger
			isOpen={open}
			onOpenChange={(nextOpen: boolean) => {
				setOpen(nextOpen);
				if (nextOpen) {
					if (skipHomeResetRef.current) {
						skipHomeResetRef.current = false;
						return;
					}
					resetSheet(identity.displayName);
				} else {
					void nameSaver.flush(name);
					nameSaver.cancel();
				}
			}}
		>
			<Button
				variant="ghost"
				size="icon"
				className="size-11 overflow-hidden rounded-full ring-1 ring-muted-foreground/50 data-[account=real]:ring-foreground/35"
				aria-label={openLabel}
				data-account={isAnonymous ? "guest" : "real"}
				isDisabled={!identity.ready && identity.sessionError === null}
			>
				<img
					className="size-full object-cover"
					src={user?.image ?? identiconUrl(user?.id ?? "guest")}
					alt=""
				/>
			</Button>
			<Dialog
				isDismissable={!busy}
				showCloseButton={false}
				className="max-h-[min(90svh,40rem)] overflow-auto"
			>
				<DialogHeader>
					<DialogTitle>{sheetTitle(mode, isAnonymous, t)}</DialogTitle>
				</DialogHeader>
				{mode === "home" ? (
					<FieldGroup className="gap-4">
						<TextField
							value={name}
							onChange={(value: string) => {
								setName(value);
								nameSaver.schedule(value);
							}}
							isDisabled={busy || !identity.ready}
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
						{isAnonymous ? (
							<div className="flex flex-wrap gap-2">
								<Button
									onPress={() => {
										setError(null);
										setMode("create");
									}}
								>
									{t("createAccount")}
								</Button>
								<Button
									onPress={() => {
										setError(null);
										setMode("signin");
									}}
								>
									{t("signIn")}
								</Button>
							</div>
						) : (
							<>
								<p className="m-0 text-sm text-muted-foreground">
									{t("signedInAs", { email: user?.email ?? t("yourAccount") })}
								</p>
								<div className="flex flex-wrap gap-2">
									<Button
										variant="ghost"
										onPress={() => {
											setError(null);
											setMode("password");
										}}
									>
										{t("changePassword")}
									</Button>
									<Button
										variant="ghost"
										onPress={() =>
											void run(async () => {
												await signOutAccount();
											})
										}
										isDisabled={busy}
									>
										{t("signOut")}
									</Button>
								</div>
								<FieldDescription>{t("changeEmailLater")}</FieldDescription>
							</>
						)}
						<Separator />
						<FieldSet disabled>
							<FieldLegend>{t("tableFeel")}</FieldLegend>
							<FieldDescription>{t("comingLater")}</FieldDescription>
							<p className="flex min-h-11 items-center justify-between gap-3 text-sm text-muted-foreground">
								{t("theme")}
								<span>{t("darkLight")}</span>
							</p>
							<p className="flex min-h-11 items-center justify-between gap-3 text-sm text-muted-foreground">
								{t("sfx")}
								<span>{t("volume")}</span>
							</p>
							<p className="flex min-h-11 items-center justify-between gap-3 text-sm text-muted-foreground">
								{t("animations")}
								<span>{t("onOff")}</span>
							</p>
						</FieldSet>
						<Link
							className="inline-flex min-h-11 items-center text-sm text-muted-foreground no-underline hover:text-primary"
							to="/assets"
							onClick={() => setOpen(false)}
						>
							{t("browseAssets")}
						</Link>
						{!isAnonymous ? <PlayerHistory history={history} loading={historyLoading} /> : null}
					</FieldGroup>
				) : null}
				{mode === "create" ? (
					<form
						className="grid gap-3"
						onSubmit={(event) => {
							event.preventDefault();
							void run(async () => {
								await nameSaver.flush(name);
								await convertAnonymousAccount(email, password);
							});
						}}
					>
						<FieldDescription>{t("createAccountCopy")}</FieldDescription>
						<EmailPasswordFields
							email={email}
							password={password}
							onEmail={setEmail}
							onPassword={setPassword}
							busy={busy}
							autoCompletePassword="new-password"
						/>
						<div className="flex flex-wrap gap-2">
							<Button type="submit" isDisabled={busy}>
								{busy ? t("saving") : t("createAccount")}
							</Button>
							<Button
								variant="ghost"
								onPress={() => {
									setError(null);
									setMode("home");
								}}
								isDisabled={busy}
							>
								{t("back")}
							</Button>
						</div>
					</form>
				) : null}
				{mode === "signin" ? (
					<form
						className="grid gap-3"
						onSubmit={(event) => {
							event.preventDefault();
							void run(async () => {
								await signInAccount(email, password);
							});
						}}
					>
						<FieldDescription>{t("signInCopy")}</FieldDescription>
						<EmailPasswordFields
							email={email}
							password={password}
							onEmail={setEmail}
							onPassword={setPassword}
							busy={busy}
							autoCompletePassword="current-password"
						/>
						<div className="flex flex-wrap gap-2">
							<Button type="submit" isDisabled={busy}>
								{busy ? t("signingIn") : t("signIn")}
							</Button>
							<Button
								variant="ghost"
								onPress={() => {
									setError(null);
									setMode("home");
								}}
								isDisabled={busy}
							>
								{t("back")}
							</Button>
						</div>
					</form>
				) : null}
				{mode === "password" ? (
					<form
						className="grid gap-3"
						onSubmit={(event) => {
							event.preventDefault();
							void run(async () => {
								await changeAccountPassword(currentPassword, newPassword);
							});
						}}
					>
						<TextField value={currentPassword} onChange={setCurrentPassword} isDisabled={busy}>
							<Field>
								<FieldLabel>{t("currentPassword")}</FieldLabel>
								<Input
									type="password"
									autoComplete="current-password"
									minLength={MIN_PASSWORD_LENGTH}
									maxLength={MAX_PASSWORD_LENGTH}
								/>
							</Field>
						</TextField>
						<TextField value={newPassword} onChange={setNewPassword} isDisabled={busy}>
							<Field>
								<FieldLabel>{t("newPassword")}</FieldLabel>
								<Input
									type="password"
									autoComplete="new-password"
									minLength={MIN_PASSWORD_LENGTH}
									maxLength={MAX_PASSWORD_LENGTH}
								/>
							</Field>
						</TextField>
						<div className="flex flex-wrap gap-2">
							<Button type="submit" isDisabled={busy}>
								{busy ? t("saving") : t("savePassword")}
							</Button>
							<Button
								variant="ghost"
								onPress={() => {
									setError(null);
									setMode("home");
								}}
								isDisabled={busy}
							>
								{t("back")}
							</Button>
						</div>
					</form>
				) : null}
				{shownError ? (
					<Alert variant="destructive">
						<AlertDescription>{shownError}</AlertDescription>
					</Alert>
				) : null}
				<DialogFooter>
					<DialogClose variant="ghost" isDisabled={busy}>
						{t("close")}
					</DialogClose>
				</DialogFooter>
			</Dialog>
		</DialogTrigger>
	);
}

function sheetTitle(mode: SheetMode, isAnonymous: boolean, t: Translate): string {
	if (mode === "create") {
		return t("createAccount");
	}
	if (mode === "signin") {
		return t("signIn");
	}
	if (mode === "password") {
		return t("changePassword");
	}
	return isAnonymous ? t("guest") : t("you");
}

function EmailPasswordFields({
	email,
	password,
	onEmail,
	onPassword,
	busy,
	autoCompletePassword,
}: {
	email: string;
	password: string;
	onEmail: (value: string) => void;
	onPassword: (value: string) => void;
	busy: boolean;
	autoCompletePassword: string;
}) {
	const { t } = useI18n();
	return (
		<>
			<TextField value={email} onChange={onEmail} isDisabled={busy}>
				<Field>
					<FieldLabel>{t("email")}</FieldLabel>
					<Input type="email" autoComplete="email" required />
				</Field>
			</TextField>
			<TextField value={password} onChange={onPassword} isDisabled={busy}>
				<Field>
					<FieldLabel>{t("password")}</FieldLabel>
					<Input
						type="password"
						autoComplete={autoCompletePassword}
						minLength={MIN_PASSWORD_LENGTH}
						maxLength={MAX_PASSWORD_LENGTH}
						required
					/>
				</Field>
			</TextField>
		</>
	);
}
