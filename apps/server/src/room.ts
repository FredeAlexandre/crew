import { echoFact, echoIntentSchema } from "@crew/protocol";
import * as Cloudflare from "alchemy/Cloudflare";
import * as Effect from "effect/Effect";

/**
 * One Durable Object per room. Echo stub for repo-setup; intents land later.
 * @see https://alchemy.run/cloudflare/compute/durable-objects/
 * @see https://alchemy.run/cloudflare/compute/hibernatable-websockets/
 */
export default class Room extends Cloudflare.DurableObject<Room>()(
	"Room",
	Effect.gen(function* () {
		const state = yield* Cloudflare.DurableObjectState;

		return Effect.gen(function* () {
			const sessions = new Map<string, Cloudflare.WebSocket>();
			let seq = (yield* state.storage.get<number>("seq")) ?? 0;

			for (const socket of yield* state.getWebSockets()) {
				const data = socket.deserializeAttachment<{ id: string }>();
				if (data) {
					sessions.set(data.id, socket);
				}
			}

			const broadcast = (text: string) =>
				Effect.gen(function* () {
					for (const peer of sessions.values()) {
						yield* peer.send(text);
					}
				});

			return {
				fetch: Effect.gen(function* () {
					const [response, socket] = yield* Cloudflare.upgrade();
					const id = crypto.randomUUID();
					socket.serializeAttachment({ id });
					sessions.set(id, socket);
					return response;
				}),
				webSocketMessage: Effect.fn(function* (
					socket: Cloudflare.WebSocket,
					message: string | ArrayBuffer,
				) {
					const attachment = socket.deserializeAttachment<{ id: string }>();
					if (!attachment) {
						return;
					}
					const text = typeof message === "string" ? message : new TextDecoder().decode(message);
					let parsedMessage: unknown;
					try {
						parsedMessage = JSON.parse(text) as unknown;
					} catch {
						yield* socket.send(JSON.stringify({ type: "error", message: "invalid json" }));
						return;
					}
					const parsed = echoIntentSchema.safeParse(parsedMessage);
					if (!parsed.success) {
						yield* socket.send(JSON.stringify({ type: "error", message: "invalid echo intent" }));
						return;
					}
					seq += 1;
					yield* state.storage.put("seq", seq);
					const fact = echoFact(parsed.data, seq);
					yield* broadcast(JSON.stringify(fact));
				}),
				webSocketClose: Effect.fn(function* (
					ws: Cloudflare.WebSocket,
					code: number,
					reason: string,
				) {
					const attachment = ws.deserializeAttachment<{ id: string }>();
					if (attachment) {
						sessions.delete(attachment.id);
					}
					yield* ws.close(code, reason);
				}),
				broadcast,
			};
		});
	}),
) {}
