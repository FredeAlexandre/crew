/// <reference path="../../../packages/env/env.d.ts" />
import { createAuth } from "@crew/auth";
import { emptyState } from "@crew/engine";
import { env } from "@crew/env/server";
import { project } from "@crew/view-model/project";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

const app = new Hono<{ Bindings: Env }>();

app.use(logger());
app.use(
	"/*",
	cors({
		origin: env.CORS_ORIGIN,
		allowMethods: ["GET", "POST", "OPTIONS"],
		allowHeaders: ["Content-Type", "Authorization"],
		credentials: true,
	}),
);

app.on(["POST", "GET"], "/api/auth/*", (c) => createAuth().handler(c.req.raw));

app.get("/", (c) => c.text("OK"));

app.get("/hello-fixture", (c) => c.json(project(emptyState(), 0)));

app.get("/room/:name", (c) => {
	if (c.req.header("upgrade")?.toLowerCase() !== "websocket") {
		return c.text("Expected Upgrade: websocket", 426);
	}
	const stub = c.env.ROOM.getByName(c.req.param("name"));
	return stub.fetch(c.req.raw);
});

export default app;
