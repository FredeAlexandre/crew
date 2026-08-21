import { drizzle } from "drizzle-orm/d1";

import * as schema from "./schema/index.ts";

export { ensureMigrated } from "./migrate.ts";
export { players, rooms } from "./schema/game.ts";

export function createDb(d1: D1Database) {
	return drizzle(d1, { schema });
}
