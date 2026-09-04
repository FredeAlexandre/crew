import { authClient } from "./auth-client.ts";
import type { Translate } from "./i18n.tsx";
import { ensureGuestSession } from "./rooms.ts";

export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 128;

class AccountError extends Error {
	readonly code: string;

	constructor(code: string, message: string) {
		super(message);
		this.name = "AccountError";
		this.code = code;
	}
}

type AuthFetchError = {
	status?: number;
	statusText?: string;
	message?: string;
	code?: string;
};

function errorFromFetch(error: AuthFetchError, fallback: string): AccountError {
	const code = error.code ?? error.statusText ?? "unexpected";
	const message = error.message ?? fallback;
	return new AccountError(code, message);
}

export async function convertAnonymousAccount(email: string, password: string): Promise<void> {
	await ensureGuestSession();
	const result = await authClient.$fetch("/convert-anonymous", {
		method: "POST",
		body: { email, password },
	});
	if (result.error) {
		throw errorFromFetch(result.error, "createAccountFailed");
	}
	await authClient.getSession();
}

export async function signInAccount(email: string, password: string): Promise<void> {
	const result = await authClient.signIn.email({ email, password });
	if (result.error) {
		throw new AccountError(
			result.error.code ?? "unexpected",
			result.error.message ?? "signInFailed",
		);
	}
	await authClient.getSession();
}

export async function signOutAccount(): Promise<void> {
	await authClient.signOut();
	await ensureGuestSession();
	await authClient.getSession();
}

export async function changeAccountPassword(
	currentPassword: string,
	newPassword: string,
): Promise<void> {
	const result = await authClient.changePassword({
		currentPassword,
		newPassword,
		revokeOtherSessions: false,
	});
	if (result.error) {
		throw new AccountError(
			result.error.code ?? "unexpected",
			result.error.message ?? "passwordChangeFailed",
		);
	}
}

export function accountErrorCopy(error: unknown, t: Translate): string {
	if (error instanceof AccountError) {
		if (error.message === "createAccountFailed") {
			return t("createAccountFailed");
		}
		if (error.message === "signInFailed") {
			return t("signInFailed");
		}
		if (error.message === "passwordChangeFailed") {
			return t("passwordChangeFailed");
		}
		return t("accountUpdateFailed");
	}
	return t("accountUpdateFailed");
}
