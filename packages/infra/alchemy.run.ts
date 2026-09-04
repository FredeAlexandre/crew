import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as Alchemy from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import * as Config from "effect/Config";
import * as Effect from "effect/Effect";
import type Room from "../../apps/server/src/room.ts";

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), "../db/src/migrations");

/** Declared local ports. Vite must use these, not `serverWorker.url`, which can be a fallback port if 3000 is already taken. */
const LOCAL_SERVER_PORT = 3000;
const LOCAL_WEB_PORT = 3001;

function previewPrNumber(stage: string): string | undefined {
	return /^pr-(\d+)$/.exec(stage)?.[1];
}

function websiteDomain(stage: string): string | undefined {
	if (stage === "prod") {
		return "crew.aleno.casa";
	}
	const pr = previewPrNumber(stage);
	return pr === undefined ? undefined : `crew-pr-${pr}.aleno.casa`;
}

export const db = Cloudflare.D1.Database("database", {
	migrationsDir,
});

export const server = Cloudflare.Worker("server", {
	main: "../../apps/server/src/index.ts",
	compatibility: {
		flags: ["nodejs_compat"],
	},
	env: {
		DB: db,
		CORS_ORIGIN: Config.string("CORS_ORIGIN"),
		BETTER_AUTH_SECRET: Config.redacted("BETTER_AUTH_SECRET"),
		BETTER_AUTH_URL: Cloudflare.Worker.URL,
		ROOM: Cloudflare.DurableObject<Room>("Room"),
	},
	dev: {
		port: LOCAL_SERVER_PORT,
	},
});

export type ServerEnv = Cloudflare.InferEnv<typeof server>;

export default Alchemy.Stack(
	"crew",
	{
		providers: Cloudflare.providers(),
		state: Cloudflare.state(),
	},
	Effect.gen(function* () {
		const stack = yield* Alchemy.Stack;
		const domain = websiteDomain(stack.stage);
		yield* db;
		const serverWorker = yield* server;
		const webWorker = yield* Cloudflare.Website.Vite("web", {
			rootDir: "../../apps/web",
			...(domain === undefined ? {} : { domain }),
			assets: {
				htmlHandling: "auto-trailing-slash",
				notFoundHandling: "single-page-application",
			},
			env: {
				VITE_SERVER_URL:
					domain === undefined
						? `http://localhost:${LOCAL_SERVER_PORT}`
						: serverWorker.url.as<string>(),
			},
			dev: {
				port: LOCAL_WEB_PORT,
			},
		});

		return {
			web: webWorker.url,
			server: serverWorker.url,
		};
	}),
);
