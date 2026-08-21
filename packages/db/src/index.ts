import { env } from "@crew/env/server";
import { drizzle } from "drizzle-orm/d1";

import * as schema from "./schema/index.ts";

export { players, rooms } from "./schema/game.ts";

export function createDb(d1: D1Database = env.DB) {
	return drizzle(d1, { schema });
}
