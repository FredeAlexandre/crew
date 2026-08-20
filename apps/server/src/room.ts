import { DurableObject } from "cloudflare:workers";
import { echoFact, echoIntentSchema } from "@crew/protocol";

/**
 * One Durable Object per room. Echo stub; play intents land later.
 *
 * This is a native `cloudflare:workers` Durable Object because the Worker is
 * Hono (`async fetch`). Alchemy only injects DurableObjectBridge (and therefore
 * a workerd `fetch`) for Effect Workers. Calling `env.ROOM.getByName().fetch()`
 * from Hono against an Effect DO fails with
 * "Handler does not export a fetch() function".
 *
 * @see https://alchemy.run/cloudflare/compute/durable-objects/#binding-in-an-async-worker
 */
export default class Room extends DurableObject {
	async fetch(request: Request): Promise<Response> {
		if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
			return new Response("Expected Upgrade: websocket", { status: 426 });
		}
		const pair = new WebSocketPair();
		const client = pair[0];
		const server = pair[1];
		server.serializeAttachment({ id: crypto.randomUUID() });
		this.ctx.acceptWebSocket(server);
		return new Response(null, { status: 101, webSocket: client });
	}

	async webSocketMessage(socket: WebSocket, message: string | ArrayBuffer) {
		const text = typeof message === "string" ? message : new TextDecoder().decode(message);
		let parsedMessage: unknown;
		try {
			parsedMessage = JSON.parse(text) as unknown;
		} catch {
			socket.send(JSON.stringify({ type: "error", message: "invalid json" }));
			return;
		}
		const parsed = echoIntentSchema.safeParse(parsedMessage);
		if (!parsed.success) {
			socket.send(JSON.stringify({ type: "error", message: "invalid echo intent" }));
			return;
		}
		const seq = ((await this.ctx.storage.get<number>("seq")) ?? 0) + 1;
		await this.ctx.storage.put("seq", seq);
		const fact = JSON.stringify(echoFact(parsed.data, seq));
		for (const peer of this.ctx.getWebSockets()) {
			peer.send(fact);
		}
	}

	async webSocketClose(ws: WebSocket, code: number, reason: string) {
		if (code === 1005 || code === 1006 || code === 1015) {
			return;
		}
		ws.close(code, reason);
	}
}
