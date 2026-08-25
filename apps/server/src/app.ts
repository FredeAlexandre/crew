/// <reference path="../../../packages/env/env.d.ts" />
import { createAuth } from "@crew/auth";
import { ensureMigrated } from "@crew/db";
import { env } from "@crew/env/server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { registerHistoryRoutes } from "./history-http.ts";
import { registerRoomRoutes } from "./rooms-http.ts";

const app = new Hono<{ Bindings: Env }>();

app.use(async (c, next) => {
	await ensureMigrated(c.env.DB);
	return next();
});
app.use(logger());
app.use(async (c, next) => {
	if (c.req.header("upgrade")?.toLowerCase() === "websocket") {
		return next();
	}
	return cors({
		origin: env.CORS_ORIGIN,
		allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
		allowHeaders: ["Content-Type", "Authorization"],
		credentials: true,
	})(c, next);
});

app.on(["POST", "GET"], "/api/auth/*", (c) => createAuth().handler(c.req.raw));

app.get("/", (c) => c.text("OK"));

registerRoomRoutes(app);
registerHistoryRoutes(app);

export default app;
