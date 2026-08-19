import { env } from "@crew/env/server";
import { drizzle } from "drizzle-orm/d1";

import * as schema from "./schema/index.ts";

export function createDb() {
	return drizzle(env.DB, { schema });
}
