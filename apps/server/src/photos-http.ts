import { createDb, user } from "@crew/db";
import { eq } from "drizzle-orm";
import type { Hono } from "hono";
import {
	inspectPhoto,
	parsePhotoId,
	photoIdFromStoredUrl,
	photoObjectKey,
	photoPublicUrl,
} from "./photos.ts";
import { errorPayload, requireAuthenticatedPlayer, requirePlayer } from "./session.ts";

export function registerPhotoRoutes(app: Hono<{ Bindings: Env }>) {
	app.post("/photos", async (c) => {
		const player = await requireAuthenticatedPlayer(c);
		if (player instanceof Response) {
			return player;
		}

		const form = await c.req.formData().catch(() => null);
		const file = form?.get("photo");
		if (!(file instanceof File)) {
			return c.json(errorPayload("missingFile", "Choose a photo."), 400);
		}

		const bytes = new Uint8Array(await file.arrayBuffer());
		const inspected = inspectPhoto(bytes);
		if (!inspected.ok) {
			if (inspected.code === "tooLarge") {
				return c.json(errorPayload("tooLarge", "Photo must be 5 MB or smaller."), 400);
			}
			return c.json(errorPayload("unsupportedType", "Use a JPEG, PNG, or WebP photo."), 400);
		}

		const db = createDb(c.env.DB);
		const existing = await db
			.select({ image: user.image })
			.from(user)
			.where(eq(user.id, player.playerId))
			.limit(1);
		const origin = new URL(c.req.url).origin;
		const previousId = photoIdFromStoredUrl(existing[0]?.image ?? "", origin);
		const id = crypto.randomUUID();

		await c.env.PHOTOS.put(photoObjectKey(id), bytes, {
			httpMetadata: { contentType: inspected.contentType },
		});
		const url = photoPublicUrl(origin, id);
		await db.update(user).set({ image: url }).where(eq(user.id, player.playerId));
		if (previousId !== null) {
			await c.env.PHOTOS.delete(photoObjectKey(previousId));
		}
		return c.json({ url });
	});

	app.delete("/photos", async (c) => {
		const player = await requirePlayer(c);
		if (player instanceof Response) {
			return player;
		}

		const db = createDb(c.env.DB);
		const existing = await db
			.select({ image: user.image })
			.from(user)
			.where(eq(user.id, player.playerId))
			.limit(1);
		const origin = new URL(c.req.url).origin;
		const previousId = photoIdFromStoredUrl(existing[0]?.image ?? "", origin);
		await db.update(user).set({ image: null }).where(eq(user.id, player.playerId));
		if (previousId !== null) {
			await c.env.PHOTOS.delete(photoObjectKey(previousId));
		}
		return c.json({ url: null });
	});

	app.get("/photos/:id", async (c) => {
		const id = parsePhotoId(c.req.param("id"));
		if (id === null) {
			return c.json(errorPayload("unknownPhoto", "photo not found"), 404);
		}
		const object = await c.env.PHOTOS.get(photoObjectKey(id));
		if (object === null) {
			return c.json(errorPayload("unknownPhoto", "photo not found"), 404);
		}
		const headers = new Headers();
		headers.set("Content-Type", object.httpMetadata?.contentType ?? "application/octet-stream");
		headers.set("Cache-Control", "public, max-age=31536000, immutable");
		if (object.httpEtag.length > 0) {
			headers.set("ETag", object.httpEtag);
		}
		return new Response(object.body, { headers });
	});
}
