import { pickSeatIntent } from "@crew/engine";
import { describe, expect, it, vi } from "vitest";
import {
	connect,
	createTable,
	disconnect,
	factsForSeat,
	handleIntent,
	isBotPlayerId,
	playBotTurn,
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
	it("lets a seated player rename themself before the game starts", () => {
		const seated = sitAll();
		const renamed = mustOk(
			handleIntent(seated, "p1", { type: "player.rename", displayName: "Bex" }),
		);
		expect(renamed.state.seats[1]?.displayName).toBe("Bex");
		expect(viewForSeat(renamed.state, 0).seats.find((seat) => seat.seatId === 1)?.displayName).toBe(
			"Bex",
		);
		expect(renamed.facts).toEqual([
			{
				type: "player.renamed",
				attemptId: null,
				seq: seated.seq + 1,
				seatId: 1,
				displayName: "Bex",
			},
		]);

		const unchanged = mustOk(
			handleIntent(renamed.state, "p1", { type: "player.rename", displayName: "Bex" }),
		);
		expect(unchanged.state.seq).toBe(renamed.state.seq);
		expect(unchanged.facts).toEqual([]);

		const started = startGame(readyAll(renamed.state)).state;
		const late = handleIntent(started, "p1", { type: "player.rename", displayName: "Bea" });
		expect(late.ok).toBe(false);
		if (!late.ok) {
			expect(late.code).toBe("alreadyStarted");
		}
	});

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
			completedTricksVisible: false,
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
				completedTricksVisible: false,
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
			completedTricksVisible: false,
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

	it("lets the host grow and shrink empty chairs without a new table", () => {
		const host = sit(fresh(), "p0", "Alex");
		const grown = mustOk(
			handleIntent(host, "p0", {
				type: "host.configure",
				difficulty: 4,
				captainSeat: null,
				distressDisabled: true,
				completedTricksVisible: true,
				playerCount: 5,
			}),
		);
		expect(grown.state.code).toBe(host.code);
		expect(grown.state.playerCount).toBe(5);
		expect(grown.state.seats).toHaveLength(5);
		expect(grown.state.seats.slice(1)).toEqual([null, null, null, null]);
		expect(viewForSeat(grown.state, 0).playerCount).toBe(5);
		expect(viewForSeat(grown.state, 0).seats).toHaveLength(5);

		const guest = handleIntent(grown.state, "p0", {
			type: "host.configure",
			difficulty: 4,
			captainSeat: null,
			distressDisabled: true,
			completedTricksVisible: true,
			playerCount: 4,
		});
		expect(guest.ok).toBe(true);
		if (!guest.ok) {
			return;
		}
		expect(guest.state.playerCount).toBe(4);
		expect(guest.state.seats).toHaveLength(4);

		const seated = sit(sit(guest.state, "p1", "Bea"), "p2", "Cam");
		const last = sit(seated, "p3", "Dee");
		const blocked = handleIntent(last, "p0", {
			type: "host.configure",
			difficulty: 4,
			captainSeat: null,
			distressDisabled: true,
			completedTricksVisible: true,
			playerCount: 3,
		});
		expect(blocked.ok).toBe(false);
		if (!blocked.ok) {
			expect(blocked.code).toBe("illegalIntent");
		}

		const kicked = mustOk(handleIntent(last, "p0", { type: "host.kick", seatId: 3 })).state;
		const shrunk = mustOk(
			handleIntent(kicked, "p0", {
				type: "host.configure",
				difficulty: 4,
				captainSeat: 3,
				distressDisabled: true,
				completedTricksVisible: true,
				playerCount: 3,
			}),
		);
		expect(shrunk.state.playerCount).toBe(3);
		expect(shrunk.state.seats).toHaveLength(3);
		expect(shrunk.state.setup.captainSeat).toBeNull();
		expect(viewForSeat(shrunk.state, 0).playerCount).toBe(3);
	});

	it("lets the host remove a bot the same way as a guest", () => {
		const host = sit(fresh(), "p0", "Alex");
		const filled = mustOk(handleIntent(host, "p0", { type: "host.fillBots", seatId: 2 })).state;
		const removed = mustOk(handleIntent(filled, "p0", { type: "host.kick", seatId: 2 })).state;
		expect(removed.seats[2]).toBeNull();
		expect(removed.kicks).toEqual({});
	});

	it("skips distress by default and lets the host turn it on before start", () => {
		const seated = sitAll();
		expect(viewForSeat(seated, 0).chrome.flags.distressDisabled).toBe(true);
		const startedOff = startGame(readyAll(seated));
		expect(startedOff.state.engine?.mission?.flags?.distressDisabled).toBe(true);

		let current = startedOff.state;
		let offeredDistress = startedOff.facts.some((fact) => fact.type === "distress.offered");
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

		const enabled = mustOk(
			handleIntent(sitAll(), "p0", {
				type: "host.configure",
				difficulty: 4,
				captainSeat: null,
				distressDisabled: false,
				completedTricksVisible: true,
			}),
		);
		expect(viewForSeat(enabled.state, 1).chrome.flags.distressDisabled).toBe(false);
		const startedOn = startGame(readyAll(enabled.state));
		expect(startedOn.state.engine?.mission?.flags?.distressDisabled).toBeUndefined();
	});

	it("shows completed tricks by default", () => {
		const seated = sitAll();
		expect(viewForSeat(seated, 0).chrome.flags.completedTricksVisible).toBe(true);
		const started = startGame(readyAll(seated));
		expect(viewForSeat(started.state, 1).chrome.flags.completedTricksVisible).toBe(true);
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
		const until = left.state.leavingUntil?.p1;
		if (until === undefined) throw new Error("expected departure deadline");
		expect(removeLeaving(left.state, until - 1).seats[1]).not.toBeNull();
		expect(removeLeaving(left.state, until).seats[1]).toBeNull();
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
			if ((engine.hands[1] ?? []).includes(cardId)) {
				continue;
			}
			if (engine.tasks.some((task) => JSON.stringify(task.spec).includes(cardId))) {
				continue;
			}
			expect(dumped1.includes(cardId)).toBe(false);
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

		const originalIds = (ended.engine?.tasks ?? []).map((task) => task.spec.id);
		const sameTasks = mustOk(
			handleIntent(
				ended,
				"p0",
				{ type: "host.retry", keepTasks: true },
				{ seed: 3, attemptId: "a3" },
			),
		);
		expect(sameTasks.state.engine?.tasks.map((task) => task.spec.id)).toEqual(originalIds);
		expect(sameTasks.state.engine?.tasks.every((task) => task.ownerSeat === null)).toBe(true);
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

	it("lets the host fill one empty seat", () => {
		const host = sit(fresh(), "p0", "Alex");
		const filled = mustOk(handleIntent(host, "p0", { type: "host.fillBots", seatId: 2 })).state;
		expect(filled.seats.map((seat) => seat?.displayName ?? null)).toEqual(["Alex", null, "Bot 1"]);
		expect(filled.seats[2]?.ready && filled.seats[2]?.connected).toBe(true);
		expect(isBotPlayerId(filled.seats[2]?.playerId ?? "")).toBe(true);
		expect(viewForSeat(filled, 0).affordances.canFillBots).toBe(true);

		const second = mustOk(handleIntent(filled, "p0", { type: "host.fillBots", seatId: 1 })).state;
		expect(second.seats.map((seat) => seat?.displayName)).toEqual(["Alex", "Bot 2", "Bot 1"]);

		const taken = handleIntent(second, "p0", { type: "host.fillBots", seatId: 1 });
		expect(taken.ok).toBe(false);
		if (!taken.ok) {
			expect(taken.code).toBe("illegalSeat");
		}
	});

	it("plays one bot turn at a time and pauses on distress", () => {
		const filled = mustOk(
			handleIntent(sit(fresh(), "p0", "Alex"), "p0", { type: "host.fillBots" }),
		).state;
		const lobby = mustOk(
			handleIntent(filled, "p0", {
				type: "host.configure",
				difficulty: 4,
				captainSeat: null,
				distressDisabled: false,
				completedTricksVisible: true,
			}),
		).state;
		const ready = mustOk(handleIntent(lobby, "p0", { type: "player.ready", ready: true })).state;
		const started = mustOk(
			handleIntent(ready, "p0", { type: "host.start" }, { seed: 1, attemptId: "a1" }),
		).state;
		expect(started.status).toBe("playing");
		expect(started.engine).not.toBeNull();
		expect(isBotPlayerId(started.seats[started.engine?.currentSeat ?? 0]?.playerId ?? "")).toBe(
			true,
		);

		let current = started;
		while (current.engine?.phase === "taskDraft") {
			const seat = current.engine.currentSeat;
			if (seat === null) {
				throw new Error("expected draft seat");
			}
			if (isBotPlayerId(current.seats[seat]?.playerId ?? "")) {
				current = mustOk(playBotTurn(current)).state;
				continue;
			}
			const intent = pickSeatIntent(current.engine, seat);
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
		if (isBotPlayerId(playing.seats[turn]?.playerId ?? "")) {
			const afterOneBot = mustOk(playBotTurn(playing)).state;
			expect(afterOneBot.seq).toBeGreaterThan(playing.seq);
		}
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
