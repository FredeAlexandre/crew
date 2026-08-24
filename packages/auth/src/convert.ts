import { APIError, createAuthEndpoint, sessionMiddleware } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import { z } from "zod";

const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;

const convertBodySchema = z.object({
	email: z.string(),
	password: z.string(),
});

type ConvertParseError = "invalidEmail" | "passwordTooShort" | "passwordTooLong";

type ConvertInput =
	| { ok: true; email: string; password: string }
	| { ok: false; code: ConvertParseError };

export function parseConvertInput(body: unknown): ConvertInput {
	if (typeof body !== "object" || body === null) {
		return { ok: false, code: "invalidEmail" };
	}
	const emailRaw = "email" in body ? body.email : undefined;
	const passwordRaw = "password" in body ? body.password : undefined;
	if (typeof emailRaw !== "string") {
		return { ok: false, code: "invalidEmail" };
	}
	const email = emailRaw.trim().toLowerCase();
	if (z.email().safeParse(email).success === false) {
		return { ok: false, code: "invalidEmail" };
	}
	if (typeof passwordRaw !== "string") {
		return { ok: false, code: "passwordTooShort" };
	}
	if (passwordRaw.length < MIN_PASSWORD_LENGTH) {
		return { ok: false, code: "passwordTooShort" };
	}
	if (passwordRaw.length > MAX_PASSWORD_LENGTH) {
		return { ok: false, code: "passwordTooLong" };
	}
	return { ok: true, email, password: passwordRaw };
}

function isAnonymousUser(user: Record<string, unknown>): boolean {
	return user.isAnonymous === true;
}

export function convertAnonymous() {
	return {
		id: "crew-convert" as const,
		endpoints: {
			convertAnonymous: createAuthEndpoint(
				"/convert-anonymous",
				{
					method: "POST",
					body: convertBodySchema,
					use: [sessionMiddleware],
				},
				async (ctx) => {
					const session = ctx.context.session;
					if (!isAnonymousUser(session.user as Record<string, unknown>)) {
						throw APIError.from("BAD_REQUEST", {
							code: "USER_IS_NOT_ANONYMOUS",
							message: "This session already has an account.",
						});
					}

					const parsed = parseConvertInput(ctx.body);
					if (!parsed.ok) {
						throw APIError.from("BAD_REQUEST", {
							code: parsed.code.toUpperCase(),
							message: convertErrorMessage(parsed.code),
						});
					}

					const taken = await ctx.context.internalAdapter.findUserByEmail(parsed.email);
					if (taken !== null && taken.user.id !== session.user.id) {
						throw APIError.from("BAD_REQUEST", {
							code: "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL",
							message: "That email already has an account. Sign in instead.",
						});
					}

					const accounts = await ctx.context.internalAdapter.findAccounts(session.user.id);
					const hasCredential = accounts.some(
						(account) => account.providerId === "credential" && Boolean(account.password),
					);
					if (!hasCredential) {
						const passwordHash = await ctx.context.password.hash(parsed.password);
						await ctx.context.internalAdapter.linkAccount({
							userId: session.user.id,
							providerId: "credential",
							accountId: session.user.id,
							password: passwordHash,
						});
					}

					const updatedUser = await ctx.context.internalAdapter.updateUser(session.user.id, {
						email: parsed.email,
						isAnonymous: false,
					});
					const user = updatedUser ?? {
						...session.user,
						email: parsed.email,
						isAnonymous: false,
					};

					await setSessionCookie(ctx, {
						session: session.session,
						user,
					});

					return ctx.json({
						playerId: session.user.id,
						email: parsed.email,
					});
				},
			),
		},
	};
}

export function convertErrorMessage(code: ConvertParseError): string {
	switch (code) {
		case "invalidEmail":
			return "Enter a valid email.";
		case "passwordTooShort":
			return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
		case "passwordTooLong":
			return `Password must be at most ${MAX_PASSWORD_LENGTH} characters.`;
	}
}
