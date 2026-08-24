import { useEffect, useRef, useState } from "react";
import {
	Button,
	Dialog,
	DialogTrigger,
	FileTrigger,
	Heading,
	Input,
	Label,
	Modal,
	ModalOverlay,
	TextField,
} from "react-aria-components";
import { useIdentity } from "../hooks/use-identity.ts";
import {
	accountErrorCopy,
	changeAccountPassword,
	convertAnonymousAccount,
	MAX_PASSWORD_LENGTH,
	MIN_PASSWORD_LENGTH,
	removeAccountPhoto,
	signInAccount,
	signOutAccount,
	uploadAccountPhoto,
} from "../lib/account.ts";
import {
	createDebouncedAction,
	DISPLAY_NAME_DEBOUNCE_MS,
	DISPLAY_NAME_MAX,
} from "../lib/display-name.ts";
import { type Translate, useI18n } from "../lib/i18n.tsx";
import { persistDisplayName } from "../lib/rooms.ts";
import styles from "../styles/identity.module.css";
import { useIdentitySheet } from "./identity-sheet.tsx";

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
	const [nameSaver] = useState(() =>
		createDebouncedAction(async (value) => {
			await persistDisplayName(value);
			await refetchRef.current();
		}, DISPLAY_NAME_DEBOUNCE_MS),
	);
	refetchRef.current = identity.refetch;

	const [open, setOpen] = useState(false);
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
				className={styles.disc}
				aria-label={openLabel}
				data-account={isAnonymous ? "guest" : "real"}
				isDisabled={!identity.ready && identity.sessionError === null}
			>
				{user?.image ? (
					<img className={styles.photo} src={user.image} alt="" />
				) : identity.initials.length > 0 ? (
					<span className={styles.initials}>{identity.initials}</span>
				) : null}
			</Button>
			<ModalOverlay className={styles.scrim} isDismissable={!busy}>
				<Modal className={styles.sheet}>
					<Dialog className={styles.dialog}>
						{({ close }: { close: () => void }) => (
							<>
								<Heading slot="title" className={styles.title}>
									{sheetTitle(mode, isAnonymous, t)}
								</Heading>
								{mode === "home" ? (
									<>
										<TextField
											className={styles.field}
											value={name}
											onChange={(value: string) => {
												setName(value);
												nameSaver.schedule(value);
											}}
											isDisabled={busy || !identity.ready}
										>
											<Label className={styles.label}>{t("name")}</Label>
											<Input
												className={styles.input}
												placeholder={t("yourName")}
												autoComplete="nickname"
												maxLength={DISPLAY_NAME_MAX}
												spellCheck="false"
											/>
										</TextField>
										{isAnonymous ? (
											<div className={styles.actions}>
												<Button
													className={styles.primary}
													onPress={() => {
														setError(null);
														setMode("create");
													}}
												>
													{t("createAccount")}
												</Button>
												<Button
													className={styles.primary}
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
												<p className={styles.copy}>
													{t("signedInAs", { email: user?.email ?? t("yourAccount") })}
												</p>
												<div className={styles.actions}>
													<Button
														className={styles.ghost}
														onPress={() => {
															setError(null);
															setMode("password");
														}}
													>
														{t("changePassword")}
													</Button>
													<Button
														className={styles.ghost}
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
												<p className={styles.hint}>{t("changeEmailLater")}</p>
											</>
										)}
										{!isAnonymous ? (
											<div className={styles.photoRow}>
												<span className={styles.label}>{t("photo")}</span>
												<div className={styles.photoActions}>
													<FileTrigger
														acceptedFileTypes={["image/jpeg", "image/png", "image/webp"]}
														onSelect={(files: FileList | null) => {
															const file = files?.item(0);
															if (file === null || file === undefined) {
																return;
															}
															void run(async () => {
																await uploadAccountPhoto(file);
															});
														}}
													>
														<Button className={styles.ghost} isDisabled={busy || !identity.ready}>
															{user?.image ? t("replace") : t("choose")}
														</Button>
													</FileTrigger>
													{user?.image ? (
														<Button
															className={styles.ghost}
															isDisabled={busy}
															onPress={() => {
																void run(async () => {
																	await removeAccountPhoto();
																});
															}}
														>
															{t("remove")}
														</Button>
													) : null}
												</div>
											</div>
										) : null}
										<fieldset className={styles.stubs} disabled>
											<legend className={styles.legend}>{t("tableFeel")}</legend>
											<p className={styles.hint}>{t("comingLater")}</p>
											<p className={styles.stubRow}>
												{t("theme")}
												<span>{t("darkLight")}</span>
											</p>
											<p className={styles.stubRow}>
												{t("sfx")}
												<span>{t("volume")}</span>
											</p>
											<p className={styles.stubRow}>
												{t("animations")}
												<span>{t("onOff")}</span>
											</p>
										</fieldset>
									</>
								) : null}
								{mode === "create" ? (
									<form
										className={styles.form}
										onSubmit={(event) => {
											event.preventDefault();
											void run(async () => {
												await nameSaver.flush(name);
												await convertAnonymousAccount(email, password);
											});
										}}
									>
										<p className={styles.copy}>{t("createAccountCopy")}</p>
										<EmailPasswordFields
											email={email}
											password={password}
											onEmail={setEmail}
											onPassword={setPassword}
											busy={busy}
											autoCompletePassword="new-password"
										/>
										<div className={styles.actions}>
											<Button className={styles.primary} type="submit" isDisabled={busy}>
												{busy ? t("saving") : t("createAccount")}
											</Button>
											<Button
												className={styles.ghost}
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
										className={styles.form}
										onSubmit={(event) => {
											event.preventDefault();
											void run(async () => {
												await signInAccount(email, password);
											});
										}}
									>
										<p className={styles.copy}>{t("signInCopy")}</p>
										<EmailPasswordFields
											email={email}
											password={password}
											onEmail={setEmail}
											onPassword={setPassword}
											busy={busy}
											autoCompletePassword="current-password"
										/>
										<div className={styles.actions}>
											<Button className={styles.primary} type="submit" isDisabled={busy}>
												{busy ? t("signingIn") : t("signIn")}
											</Button>
											<Button
												className={styles.ghost}
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
										className={styles.form}
										onSubmit={(event) => {
											event.preventDefault();
											void run(async () => {
												await changeAccountPassword(currentPassword, newPassword);
											});
										}}
									>
										<TextField
											className={styles.field}
											value={currentPassword}
											onChange={setCurrentPassword}
											isDisabled={busy}
										>
											<Label className={styles.label}>{t("currentPassword")}</Label>
											<Input
												className={styles.input}
												type="password"
												autoComplete="current-password"
												minLength={MIN_PASSWORD_LENGTH}
												maxLength={MAX_PASSWORD_LENGTH}
											/>
										</TextField>
										<TextField
											className={styles.field}
											value={newPassword}
											onChange={setNewPassword}
											isDisabled={busy}
										>
											<Label className={styles.label}>{t("newPassword")}</Label>
											<Input
												className={styles.input}
												type="password"
												autoComplete="new-password"
												minLength={MIN_PASSWORD_LENGTH}
												maxLength={MAX_PASSWORD_LENGTH}
											/>
										</TextField>
										<div className={styles.actions}>
											<Button className={styles.primary} type="submit" isDisabled={busy}>
												{busy ? t("saving") : t("savePassword")}
											</Button>
											<Button
												className={styles.ghost}
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
									<p className={styles.alert} role="alert">
										{shownError}
									</p>
								) : null}
								<Button className={styles.close} onPress={close} isDisabled={busy}>
									{t("close")}
								</Button>
							</>
						)}
					</Dialog>
				</Modal>
			</ModalOverlay>
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
			<TextField className={styles.field} value={email} onChange={onEmail} isDisabled={busy}>
				<Label className={styles.label}>{t("email")}</Label>
				<Input className={styles.input} type="email" autoComplete="email" required />
			</TextField>
			<TextField className={styles.field} value={password} onChange={onPassword} isDisabled={busy}>
				<Label className={styles.label}>{t("password")}</Label>
				<Input
					className={styles.input}
					type="password"
					autoComplete={autoCompletePassword}
					minLength={MIN_PASSWORD_LENGTH}
					maxLength={MAX_PASSWORD_LENGTH}
					required
				/>
			</TextField>
		</>
	);
}
