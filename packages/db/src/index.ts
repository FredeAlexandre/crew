import { drizzle } from "drizzle-orm/d1";

import * as schema from "./schema/index.ts";

export { ensureMigrated } from "./migrate.ts";
export { user } from "./schema/auth.ts";
export {
	campaignMembers,
	campaignSteps,
	campaigns,
	gameHistory,
	gameHistoryEvents,
	playerHistory,
	players,
	rooms,
} from "./schema/game.ts";

export function createDb(d1: D1Database) {
	return drizzle(d1, { schema });
}
