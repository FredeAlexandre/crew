import { env } from "@crew/env/web";
import { authClient } from "./auth-client.ts";
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

function authOrigin() {
	return env.VITE_SERVER_URL.replace(/\/$/, "");
}

type AuthErrorBody = {
	code?: string;
	message?: string;
	error?: { code?: string; message?: string };
};

async function readAuthError(response: Response, fallback: string): Promise<AccountError> {
	const body: unknown = await response.json().catch(() => null);
	if (typeof body === "object" && body !== null) {
		const parsed = body as AuthErrorBody;
		const code = parsed.code ?? parsed.error?.code ?? "unexpected";
		const message = parsed.message ?? parsed.error?.message ?? fallback;
		return new AccountError(code, message);
	}
	return new AccountError("unexpected", fallback);
}

export async function convertAnonymousAccount(email: string, password: string): Promise<void> {
	const response = await fetch(new URL("/api/auth/convert-anonymous", `${authOrigin()}/`), {
		method: "POST",
		credentials: "include",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ email, password }),
	});
	if (!response.ok) {
		throw await readAuthError(response, "Could not create the account.");
	}
	await authClient.getSession();
}

export async function signInAccount(email: string, password: string): Promise<void> {
	await authClient.signOut();
	const result = await authClient.signIn.email({ email, password });
	if (result.error) {
		await ensureGuestSession();
		throw new AccountError(
			result.error.code ?? "unexpected",
			result.error.message ?? "Could not sign in.",
		);
	}
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
			result.error.message ?? "Could not change the password.",
		);
	}
}

export function accountErrorCopy(error: unknown): string {
	if (error instanceof AccountError) {
		return error.message;
	}
	return "Could not update the account. Try again.";
}
