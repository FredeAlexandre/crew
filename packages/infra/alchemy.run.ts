import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as Alchemy from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import { config } from "dotenv";
import * as Config from "effect/Config";
import * as Effect from "effect/Effect";
import type Room from "../../apps/server/src/room.ts";

config({ path: "./.env" });
config({ path: "../../apps/web/.env" });
config({ path: "../../apps/server/.env" });

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), "../db/src/migrations");

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
		port: 3000,
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
		yield* db;
		const serverWorker = yield* server;
		const webWorker = yield* Cloudflare.Website.Vite("web", {
			rootDir: "../../apps/web",
			assets: {
				htmlHandling: "auto-trailing-slash",
				notFoundHandling: "single-page-application",
			},
			env: {
				VITE_SERVER_URL: serverWorker.url.as<string>(),
			},
			dev: {
				port: 3001,
			},
		});

		return {
			web: webWorker.url,
			server: serverWorker.url,
		};
	}),
);
