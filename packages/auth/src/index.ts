import { createDb } from "@crew/db";
import * as schema from "@crew/db/schema/auth";
import { env } from "@crew/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { anonymous } from "better-auth/plugins";
import { convertAnonymous } from "./convert.ts";
import { mergeAnonymousAccount } from "./merge.ts";

export function createAuth() {
	const db = createDb(env.DB);

	return betterAuth({
		database: drizzleAdapter(db, {
			provider: "sqlite",
			schema,
		}),
		trustedOrigins: [env.CORS_ORIGIN],
		emailAndPassword: {
			enabled: true,
		},
		plugins: [
			anonymous({
				generateName: () => `Guest ${crypto.randomUUID().slice(0, 8)}`,
				onLinkAccount: async ({ anonymousUser, newUser }) => {
					await mergeAnonymousAccount(db, anonymousUser.user.id, newUser.user.id);
				},
			}),
			convertAnonymous(),
		],
		secret: env.BETTER_AUTH_SECRET,
		baseURL: env.BETTER_AUTH_URL,
		advanced: {
			defaultCookieAttributes: {
				sameSite: "none",
				secure: true,
				httpOnly: true,
			},
		},
	});
}
