import { pickSeatIntent } from "@crew/engine";
import { describe, expect, it, vi } from "vitest";
import {
	connect,
	createTable,
	disconnect,
	factsForSeat,
	handleIntent,
	isBotPlayerId,
	removeLeaving,
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
	it("lets the host remove a guest and doubles the reconnect cooldown for repeat removals", () => {
		const seated = sitAll();
		const guest = handleIntent(seated, "p1", { type: "host.kick", seatId: 2 }, { now: 1_000 });
		expect(guest.ok).toBe(false);
		if (!guest.ok) {
			expect(guest.code).toBe("notHost");
		}

		const first = mustOk(
			handleIntent(seated, "p0", { type: "host.kick", seatId: 1 }, { now: 1_000 }),
		).state;
		expect(first.seats[1]).toBeNull();
		expect(first.kicks.p1).toEqual({ count: 1, blockedUntil: 11_000 });

		vi.useFakeTimers();
		vi.setSystemTime(5_000);
		const blocked = connect(first, "p1", "Bea");
		expect(blocked.ok).toBe(false);
		if (!blocked.ok) {
			expect(blocked.code).toBe("reconnectBlocked");
		}
		vi.setSystemTime(11_000);
		const returned = mustOk(connect(first, "p1", "Bea")).state;
		vi.useRealTimers();

		const second = mustOk(
			handleIntent(returned, "p0", { type: "host.kick", seatId: 1 }, { now: 12_000 }),
		).state;
		expect(second.kicks.p1).toEqual({ count: 2, blockedUntil: 32_000 });
	});

	it("does not let the host remove themself or a player after the game starts", () => {
		const seated = sitAll();
		const self = handleIntent(seated, "p0", { type: "host.kick", seatId: 0 });
		expect(self.ok).toBe(false);
		if (!self.ok) {
			expect(self.code).toBe("illegalIntent");
		}
		const started = startGame(readyAll(seated)).state;
		const afterStart = handleIntent(started, "p0", { type: "host.kick", seatId: 1 });
		expect(afterStart.ok).toBe(false);
		if (!afterStart.ok) {
			expect(afterStart.code).toBe("wrongPhase");
		}
	});

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

	it("sets canStart only for the host when every seat is ready", () => {
		const seated = sitAll();
		expect(viewForSeat(seated, 0).affordances.canStart).toBe(false);
		const ready = readyAll(seated);
		expect(viewForSeat(ready, 0).affordances.canStart).toBe(true);
		expect(viewForSeat(ready, 1).affordances.canStart).toBe(false);
		const started = startGame(ready);
		expect(viewForSeat(started.state, 0).affordances.canStart).toBe(false);
	});

	it("lets the host set difficulty and captain before start", () => {
		const seated = sitAll();
		expect(viewForSeat(seated, 0).affordances.canConfigure).toBe(true);
		expect(viewForSeat(seated, 1).affordances.canConfigure).toBe(false);
		expect(viewForSeat(seated, 0).chrome.difficulty).toBe(4);
		expect(viewForSeat(seated, 0).seats.every((seat) => !seat.isCaptain)).toBe(true);

		const guest = handleIntent(seated, "p1", {
			type: "host.configure",
			difficulty: 8,
			captainSeat: 1,
			distressDisabled: false,
		});
		expect(guest.ok).toBe(false);
		if (!guest.ok) {
			expect(guest.code).toBe("notHost");
		}

		const configured = mustOk(
			handleIntent(seated, "p0", {
				type: "host.configure",
				difficulty: 8,
				captainSeat: 1,
				distressDisabled: false,
			}),
		);
		expect(configured.facts[0]?.type).toBe("host.configured");
		expect(viewForSeat(configured.state, 1).chrome.difficulty).toBe(8);
		expect(
			viewForSeat(configured.state, 1).seats.find((seat) => seat.seatId === 1)?.isCaptain,
		).toBe(true);

		const oob = handleIntent(configured.state, "p0", {
			type: "host.configure",
			difficulty: 8,
			captainSeat: 4,
			distressDisabled: false,
		});
		expect(oob.ok).toBe(false);
		if (!oob.ok) {
			expect(oob.code).toBe("illegalSeat");
		}

		const started = startGame(readyAll(configured.state));
		expect(started.state.engine?.mission?.difficulty).toBe(8);
		expect(started.state.engine?.captainSeat).toBe(1);
		expect(started.state.engine?.hands[1]).toContain("submarine-4");
	});

	it("lets the host disable distress before start", () => {
		const seated = sitAll();
		expect(viewForSeat(seated, 0).chrome.flags.distressDisabled).toBe(false);
		const configured = mustOk(
			handleIntent(seated, "p0", {
				type: "host.configure",
				difficulty: 4,
				captainSeat: null,
				distressDisabled: true,
			}),
		);
		expect(viewForSeat(configured.state, 1).chrome.flags.distressDisabled).toBe(true);
		const started = startGame(readyAll(configured.state));
		expect(started.state.engine?.mission?.flags?.distressDisabled).toBe(true);

		let current = started.state;
		let offeredDistress = started.facts.some((fact) => fact.type === "distress.offered");
		while (current.engine?.phase === "taskDraft") {
			const seat = current.engine.currentSeat;
			if (seat === null) {
				throw new Error("draft with no current seat");
			}
			const occupant = current.seats[seat];
			if (occupant === null || occupant === undefined) {
				throw new Error("empty draft seat");
			}
			const intent = pickSeatIntent(current.engine, seat);
			if (intent === null) {
				throw new Error("no draft intent");
			}
			const next = mustOk(handleIntent(current, occupant.playerId, intent));
			offeredDistress ||= next.facts.some((fact) => fact.type === "distress.offered");
			current = next.state;
		}
		expect(offeredDistress).toBe(false);
		expect(current.engine?.phase).toBe("play");
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

	it("marks a voluntary departure and clears the seat after two seconds", () => {
		const seated = sitAll();
		const left = mustOk(handleIntent(seated, "p1", { type: "player.leave" }));
		expect(left.state.seats[1]?.connected).toBe(false);
		expect(left.state.seats[1]?.leaving).toBe(true);
		expect(viewForSeat(left.state, 0).seats[1]?.leaving).toBe(true);
		expect(removeLeaving(left.state, Date.now() + 1_999).seats[1]).not.toBeNull();
		expect(removeLeaving(left.state, Date.now() + 2_000).seats[1]).toBeNull();
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

	it("lets only the host retry after a result", () => {
		const lobby = handleIntent(sitAll(), "p0", { type: "host.retry" });
		expect(lobby.ok).toBe(false);
		if (!lobby.ok) {
			expect(lobby.code).toBe("wrongPhase");
		}

		const started = startGame();
		const during = handleIntent(started.state, "p0", { type: "host.retry" }, { seed: 2 });
		expect(during.ok).toBe(false);
		if (!during.ok) {
			expect(during.code).toBe("alreadyStarted");
		}

		const ended = forceResult(started.state);
		expect(viewForSeat(ended, 0).scene).toBe("result");
		expect(viewForSeat(ended, 0).affordances.canRetry).toBe(true);
		expect(viewForSeat(ended, 1).affordances.canRetry).toBe(false);

		const guest = handleIntent(ended, "p1", { type: "host.retry" }, { seed: 2 });
		expect(guest.ok).toBe(false);
		if (!guest.ok) {
			expect(guest.code).toBe("notHost");
		}

		const retried = mustOk(
			handleIntent(ended, "p0", { type: "host.retry" }, { seed: 2, attemptId: "a2" }),
		);
		expect(retried.state.status).toBe("playing");
		expect(retried.state.engine?.attemptId).toBe("a2");
		expect(retried.state.engine?.phase).toBe("taskDraft");
		expect(retried.state.engine?.attemptId).not.toBe(ended.engine?.attemptId);
		expect(retried.state.seats.map((seat) => seat?.playerId)).toEqual(["p0", "p1", "p2"]);
		expect(retried.facts[0]?.type).toBe("host.started");
		expect(retried.facts.some((fact) => fact.type === "task.offeredTurn")).toBe(true);
		expect(viewForSeat(retried.state, 0).scene).toBe("taskDraft");
		expect(viewForSeat(retried.state, 0).affordances.canRetry).toBe(false);
	});
});

describe("table bots", () => {
	it("lets the host fill empty seats and rejects a guest", () => {
		const host = sit(fresh(), "p0", "Alex");
		expect(viewForSeat(host, 0).affordances.canFillBots).toBe(true);
		const filled = mustOk(handleIntent(host, "p0", { type: "host.fillBots" })).state;
		expect(filled.seats.map((seat) => seat?.displayName)).toEqual(["Alex", "Bot 1", "Bot 2"]);
		expect(filled.seats.slice(1).every((seat) => seat?.ready && seat.connected)).toBe(true);
		expect(
			filled.seats.slice(1).every((seat) => seat !== null && isBotPlayerId(seat.playerId)),
		).toBe(true);
		expect(viewForSeat(filled, 0).affordances.canFillBots).toBe(false);
		expect(viewForSeat(filled, 0).affordances.canStart).toBe(false);

		const withGuest = sit(sit(fresh(), "p0", "Alex"), "p1", "Bea");
		const guest = handleIntent(withGuest, "p1", { type: "host.fillBots" });
		expect(guest.ok).toBe(false);
		if (!guest.ok) {
			expect(guest.code).toBe("notHost");
		}
		const oneBot = mustOk(handleIntent(withGuest, "p0", { type: "host.fillBots" })).state;
		expect(oneBot.seats.map((seat) => seat?.displayName)).toEqual(["Alex", "Bea", "Bot 1"]);
	});

	it("plays bot turns until a human must act, and pauses on distress", () => {
		const lobby = mustOk(
			handleIntent(sit(fresh(), "p0", "Alex"), "p0", { type: "host.fillBots" }),
		).state;
		const ready = mustOk(handleIntent(lobby, "p0", { type: "player.ready", ready: true })).state;
		const started = mustOk(
			handleIntent(ready, "p0", { type: "host.start" }, { seed: 1, attemptId: "a1" }),
		).state;
		expect(started.status).toBe("playing");
		expect(started.engine).not.toBeNull();

		let current = started;
		while (current.engine?.phase === "taskDraft") {
			const seat = current.engine.currentSeat;
			expect(seat).toBe(0);
			const intent = pickSeatIntent(current.engine, 0);
			if (intent === null) {
				throw new Error("host had no draft intent");
			}
			current = mustOk(handleIntent(current, "p0", intent)).state;
		}
		expect(current.engine?.phase).toBe("distressOffer");
		expect(current.engine?.currentSeat).toBeNull();

		const playing = mustOk(
			handleIntent(current, "p0", {
				type: "distress.skip",
				attemptId: "a1",
				seatId: 0,
			}),
		).state;
		const turn = playing.engine?.currentSeat;
		expect(turn).not.toBeNull();
		if (turn === undefined || turn === null) {
			throw new Error("expected a leader");
		}
		expect(isBotPlayerId(playing.seats[turn]?.playerId ?? "")).toBe(false);
	});
});

function forceResult(state: ReturnType<typeof fresh>) {
	if (state.engine === null) {
		throw new Error("expected engine");
	}
	return {
		...state,
		engine: {
			...state.engine,
			phase: "result" as const,
			result: "failed" as const,
			failReason: "taskImpossible",
			currentSeat: null,
		},
	};
}
