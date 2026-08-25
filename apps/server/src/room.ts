import { DurableObject } from "cloudflare:workers";
import { createDb, rooms } from "@crew/db";
import { type Fact, intentSchema, type RoomErrorCode } from "@crew/protocol";
import { eq } from "drizzle-orm";
import { botPlayDelayMs } from "./bot-delay.ts";
import { recordPlayerHistory } from "./history.ts";
import { readPlayerHeaders } from "./player-headers.ts";
import {
	connect,
	createTable,
	disconnect,
	factsForSeat,
	handleIntent,
	isBotPlayerId,
	playBotTurn,
	type RoomSummary,
	reconnectBlockedUntil,
	removeLeaving,
	seatOf,
	snapshotMessage,
	summary,
	type TableState,
} from "./table.ts";

type Attachment = { playerId: string };
type RoomBindings = { DB: D1Database };

const TABLE_KEY = "table";

/**
 * One Durable Object per room. Table host: sit / ready / start / apply.
 *
 * Native `cloudflare:workers` Durable Object because the Worker is Hono
 * (`async fetch`). Alchemy only injects DurableObjectBridge for Effect Workers.
 */
export default class Room extends DurableObject<RoomBindings> {
	async init(input: { code: string; hostPlayerId: string; playerCount: 3 | 4 | 5 }): Promise<void> {
		const existing = await this.load();
		if (existing !== null) {
			return;
		}
		await this.save(createTable(input));
	}

	async summary(): Promise<RoomSummary | null> {
		const state = await this.load();
		if (state === null) {
			return null;
		}
		return summary(state);
	}

	async reconnectBlockedUntil(playerId: string): Promise<number | null> {
		const state = await this.load();
		return state === null ? null : reconnectBlockedUntil(state, playerId);
	}

	async fetch(request: Request): Promise<Response> {
		if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
			return new Response("Expected Upgrade: websocket", { status: 426 });
		}
		const player = readPlayerHeaders(request.headers);
		if (player === null) {
			return jsonError("unauthenticated", "sign in first", 401);
		}
		const loaded = await this.load();
		if (loaded === null) {
			return jsonError("unknownRoom", "room not found", 404);
		}

		const result = connect(loaded, player.playerId, player.displayName, player.image);
		if (!result.ok) {
			return jsonError(result.code, result.message, statusFor(result.code));
		}
		await this.save(result.state);

		const pair = new WebSocketPair();
		const client = pair[0];
		const server = pair[1];
		server.serializeAttachment({ playerId: player.playerId } satisfies Attachment);
		this.ctx.acceptWebSocket(server);
		for (const peer of this.ctx.getWebSockets()) {
			if (peer === server) {
				continue;
			}
			if (this.playerIdOf(peer) === player.playerId) {
				peer.close(4000, "replaced");
			}
		}

		this.log({
			event: "connect",
			playerId: player.playerId,
			attemptId: result.state.engine?.attemptId ?? null,
			seq: result.state.seq,
		});
		this.fanout(result.state, result.facts, result.reconnect ? player.playerId : null);
		await this.scheduleBotTurn(result.state);
		return new Response(null, { status: 101, webSocket: client });
	}

	async alarm() {
		const loaded = await this.load();
		if (loaded === null) return;
		let next = removeLeaving(loaded);
		if (next !== loaded) {
			await this.save(next);
			this.fanout(next, [], null);
		}
		const result = playBotTurn(next);
		if (result.ok) {
			const previous = next;
			next = appendHistoryFacts(previous, result.state, result.facts);
			await this.save(next);
			if (previous.engine?.phase !== "result" && next.engine?.phase === "result") {
				await recordPlayerHistory(createDb(this.env.DB), next);
			}
			this.fanout(next, result.facts, null);
		}
		await this.scheduleBotTurn(next, true);
	}

	async webSocketMessage(socket: WebSocket, message: string | ArrayBuffer) {
		const playerId = this.playerIdOf(socket);
		if (playerId === null) {
			this.sendError(socket, "unauthenticated", "sign in first");
			return;
		}
		const text = typeof message === "string" ? message : new TextDecoder().decode(message);
		let parsedMessage: unknown;
		try {
			parsedMessage = JSON.parse(text) as unknown;
		} catch {
			this.sendError(socket, "illegalIntent", "invalid json");
			return;
		}
		const parsed = intentSchema.safeParse(parsedMessage);
		if (!parsed.success) {
			this.sendError(socket, "illegalIntent", "invalid intent");
			return;
		}

		const loaded = await this.load();
		if (loaded === null) {
			this.sendError(socket, "unknownRoom", "room not found");
			return;
		}
		const result = handleIntent(loaded, playerId, parsed.data);
		if (!result.ok) {
			this.sendError(socket, result.code, result.message);
			return;
		}
		const next = appendHistoryFacts(loaded, result.state, result.facts);
		await this.save(next);
		if (parsed.data.type === "player.leave") {
			await this.ctx.storage.setAlarm(Date.now() + 2_000);
		}
		if (parsed.data.type === "host.kick") {
			const removed = loaded.seats[parsed.data.seatId];
			if (removed !== null && removed !== undefined) {
				for (const peer of this.ctx.getWebSockets()) {
					if (this.playerIdOf(peer) === removed.playerId) {
						this.sendError(peer, "reconnectBlocked", "you were kicked; try again shortly");
						peer.close(4001, "kicked");
					}
				}
			}
		}
		if (result.state.status === "playing" && loaded.status === "lobby") {
			await this.markPlaying(result.state.code);
			this.log({
				event: "start",
				playerId,
				attemptId: result.state.engine?.attemptId ?? null,
				seq: result.state.seq,
			});
		}
		if (loaded.engine?.phase !== "result" && next.engine?.phase === "result") {
			await recordPlayerHistory(createDb(this.env.DB), next);
		}
		this.fanout(next, result.facts, null);
		await this.scheduleBotTurn(next);
	}

	async webSocketClose(ws: WebSocket, code: number, reason: string) {
		const playerId = this.playerIdOf(ws);
		if (playerId !== null) {
			const remaining = this.ctx.getWebSockets().some((peer) => {
				if (peer === ws) {
					return false;
				}
				return this.playerIdOf(peer) === playerId;
			});
			if (!remaining) {
				const loaded = await this.load();
				if (loaded !== null) {
					const result = disconnect(loaded, playerId);
					if (result.ok && result.facts.length > 0) {
						await this.save(result.state);
						this.fanout(result.state, result.facts, null);
					}
				}
			}
		}
		if (code === 1005 || code === 1006 || code === 1015) {
			return;
		}
		ws.close(code, reason);
	}

	private fanout(state: TableState, facts: Fact[], skipFactsForPlayerId: string | null) {
		for (const peer of this.ctx.getWebSockets()) {
			const playerId = this.playerIdOf(peer);
			if (playerId === null) {
				continue;
			}
			const seatId = seatOf(state, playerId);
			if (seatId === null) {
				continue;
			}
			if (skipFactsForPlayerId !== playerId) {
				for (const fact of factsForSeat(facts, seatId)) {
					peer.send(JSON.stringify(fact));
				}
			}
			peer.send(JSON.stringify(snapshotMessage(state, seatId)));
		}
	}

	private async markPlaying(code: string) {
		const db = createDb(this.env.DB);
		await db.update(rooms).set({ status: "playing" }).where(eq(rooms.code, code));
	}

	private async load(): Promise<TableState | null> {
		return (await this.ctx.storage.get<TableState>(TABLE_KEY)) ?? null;
	}

	private async save(state: TableState) {
		await this.ctx.storage.put(TABLE_KEY, state);
	}

	private async scheduleBotTurn(state: TableState, replace = false) {
		const seat = state.engine?.currentSeat;
		const occupant = seat === null || seat === undefined ? null : state.seats[seat];
		if (occupant === null || occupant === undefined || !isBotPlayerId(occupant.playerId)) {
			const pending = Object.values(state.leavingUntil ?? {});
			if (pending.length > 0) {
				await this.ctx.storage.setAlarm(Math.min(...pending));
			} else {
				await this.ctx.storage.deleteAlarm();
			}
			return;
		}
		if (!replace && (await this.ctx.storage.getAlarm()) !== null) return;
		const botAlarm = Date.now() + botPlayDelayMs();
		const leavingAlarm = Math.min(...Object.values(state.leavingUntil ?? {}));
		await this.ctx.storage.setAlarm(
			Number.isFinite(leavingAlarm) ? Math.min(botAlarm, leavingAlarm) : botAlarm,
		);
	}

	private playerIdOf(socket: WebSocket): string | null {
		const att = socket.deserializeAttachment() as Attachment | null;
		return att?.playerId ?? null;
	}

	private sendError(socket: WebSocket, code: RoomErrorCode, message: string) {
		socket.send(JSON.stringify({ type: "error", code, message }));
	}

	private log(fields: { event: string; playerId: string; attemptId: string | null; seq: number }) {
		console.log(
			JSON.stringify({
				roomId: this.ctx.id.name ?? this.ctx.id.toString(),
				...fields,
			}),
		);
	}
}

function jsonError(code: RoomErrorCode, message: string, status: number): Response {
	return new Response(JSON.stringify({ type: "error", code, message }), {
		status,
		headers: { "content-type": "application/json" },
	});
}

function statusFor(code: RoomErrorCode): number {
	if (code === "unauthenticated") {
		return 401;
	}
	if (code === "unknownRoom") {
		return 404;
	}
	return 409;
}

function appendHistoryFacts(previous: TableState, next: TableState, facts: Fact[]): TableState {
	if (next.engine === null || facts.length === 0) {
		return next;
	}
	const sameAttempt = previous.engine?.attemptId === next.engine.attemptId;
	return {
		...next,
		historyFacts: [...(sameAttempt ? (previous.historyFacts ?? []) : []), ...facts],
		historyStartedAt: sameAttempt ? previous.historyStartedAt : Date.now(),
	};
}
