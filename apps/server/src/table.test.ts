import { describe, expect, it } from "vitest";
import {
	connect,
	createTable,
	disconnect,
	factsForSeat,
	handleIntent,
	seatOf,
	snapshotMessage,
	summary,
	viewForSeat,
} from "./table.ts";

function fresh() {
	return createTable({ code: "ABCD", hostPlayerId: "p0", playerCount: 3 });
}

function mustOk<T extends { ok: boolean }>(result: T): Extract<T, { ok: true }> {
	if (!result.ok) {
		throw new Error(`expected ok, got ${JSON.stringify(result)}`);
	}
	return result as Extract<T, { ok: true }>;
}

function sit(state: ReturnType<typeof fresh>, playerId: string, name = playerId) {
	return mustOk(connect(state, playerId, name)).state;
}

function sitAll(state = fresh()) {
	let next = state;
	next = sit(next, "p0", "Alex");
	next = sit(next, "p1", "Bea");
	next = sit(next, "p2", "Cam");
	return next;
}

function readyAll(state: ReturnType<typeof fresh>) {
	let next = state;
	for (const id of ["p0", "p1", "p2"]) {
		next = mustOk(handleIntent(next, id, { type: "player.ready", ready: true })).state;
	}
	return next;
}

function startGame(state = readyAll(sitAll()), seed = 1) {
	return mustOk(handleIntent(state, "p0", { type: "host.start" }, { seed, attemptId: "a1" }));
}

describe("table lobby", () => {
	it("sits three players and rejects a fourth as roomFull", () => {
		const full = sitAll();
		expect(summary(full)).toEqual({
			occupancy: 3,
			status: "lobby",
			playerCount: 3,
			playerIds: ["p0", "p1", "p2"],
		});
		expect(seatOf(full, "p0")).toBe(0);
		const fourth = connect(full, "p3", "Dee");
		expect(fourth.ok).toBe(false);
		if (fourth.ok) {
			return;
		}
		expect(fourth.code).toBe("roomFull");
		expect(fourth.state.seq).toBe(full.seq);
		expect(fourth.state.seats).toHaveLength(3);
	});

	it("gates ready and start", () => {
		const two = sit(sit(fresh(), "p0", "Alex"), "p1", "Bea");
		const early = handleIntent(two, "p0", { type: "host.start" }, { seed: 1 });
		expect(early.ok).toBe(false);
		if (!early.ok) {
			expect(early.code).toBe("notReady");
		}

		const seated = sitAll(two);
		const guestStart = handleIntent(seated, "p1", { type: "host.start" }, { seed: 1 });
		expect(guestStart.ok).toBe(false);
		if (!guestStart.ok) {
			expect(guestStart.code).toBe("notHost");
		}

		const oneReady = mustOk(
			handleIntent(seated, "p0", { type: "player.ready", ready: true }),
		).state;
		const still = handleIntent(oneReady, "p0", { type: "host.start" }, { seed: 1 });
		expect(still.ok).toBe(false);
		if (!still.ok) {
			expect(still.code).toBe("notReady");
		}

		const started = startGame(readyAll(oneReady));
		expect(started.state.status).toBe("playing");
		expect(started.state.engine?.attemptId).toBe("a1");
		expect(started.facts[0]?.type).toBe("host.started");
		expect(handleIntent(started.state, "p0", { type: "host.start" }, { seed: 1 }).ok).toBe(false);
	});

	it("dims a disconnected seat without clearing it", () => {
		const seated = sitAll();
		const left = mustOk(disconnect(seated, "p1"));
		expect(left.state.seats[1]).toEqual({
			playerId: "p1",
			displayName: "Bea",
			connected: false,
			ready: false,
		});
		expect(left.facts).toEqual([
			{
				type: "player.connection",
				attemptId: null,
				seq: seated.seq + 1,
				seatId: 1,
				connected: false,
			},
		]);
		const back = mustOk(connect(left.state, "p1", "Bea"));
		expect(back.reconnect).toBe(true);
		expect(seatOf(back.state, "p1")).toBe(1);
		expect(back.state.seats[1]?.connected).toBe(true);
	});
});

describe("table play", () => {
	it("hides the other hand on a post-start snapshot", () => {
		const started = startGame();
		const engine = started.state.engine;
		if (engine === null) {
			throw new Error("expected engine");
		}
		const view0 = viewForSeat(started.state, 0);
		const view1 = viewForSeat(started.state, 1);
		expect(view0.hand.map((card) => card.cardId)).toEqual(engine.hands[0]);
		expect(view1.hand.map((card) => card.cardId)).toEqual(engine.hands[1]);
		const dumped1 = JSON.stringify(view1);
		for (const cardId of engine.hands[0] ?? []) {
			if (!(engine.hands[1] ?? []).includes(cardId)) {
				expect(dumped1.includes(cardId)).toBe(false);
			}
		}
		const snap0 = snapshotMessage(started.state, 0);
		expect(snap0.type).toBe("room.snapshot");
		expect(snap0.attemptId).toBe("a1");
		const dealt = factsForSeat(
			started.facts.filter((fact) => fact.type === "card.dealt"),
			1,
		);
		expect(dealt.some((fact) => fact.type === "card.dealt" && fact.cardId !== undefined)).toBe(
			true,
		);
		const dealtToSeat0 = dealt.filter((fact) => fact.type === "card.dealt");
		expect(
			dealtToSeat0.filter((fact) => fact.seatId === 0).every((fact) => fact.cardId === undefined),
		).toBe(true);
	});

	it("restores the same viewerSeat on reconnect", () => {
		const started = startGame();
		const left = mustOk(disconnect(started.state, "p1"));
		const back = mustOk(connect(left.state, "p1", "Bea"));
		expect(seatOf(back.state, "p1")).toBe(1);
		expect(viewForSeat(back.state, 1).viewerSeat).toBe(1);
		expect(viewForSeat(back.state, 1).hand.map((card) => card.cardId)).toEqual(
			started.state.engine?.hands[1],
		);
	});

	it("does not advance seq for an illegal play and overwrites seatId", () => {
		const started = startGame();
		const seq = started.state.seq;
		const rejected = handleIntent(started.state, "p0", {
			type: "card.play",
			attemptId: "forged",
			seatId: 4,
			cardId: "pink-1",
		});
		expect(rejected.ok).toBe(false);
		if (!rejected.ok) {
			expect(rejected.code).toBe("wrongPhase");
			expect(rejected.state.seq).toBe(seq);
			expect(rejected.state.engine).toBe(started.state.engine);
		}
		const echo = handleIntent(started.state, "p0", {
			type: "echo",
			attemptId: "a1",
			seq: 0,
			payload: 1,
		});
		expect(echo.ok).toBe(false);
		if (!echo.ok) {
			expect(echo.code).toBe("illegalIntent");
		}
	});
});
