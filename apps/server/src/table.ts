import { apply, createAttempt, type EngineState, type PlayerCount } from "@crew/engine";
import type {
	Fact,
	Intent,
	PlayIntent,
	RoomErrorCode,
	SeatId,
	SnapshotEnvelope,
} from "@crew/protocol";
import type { TableView } from "@crew/view-model";
import { type Occupancy, project, projectFacts, projectLobby } from "@crew/view-model/project";

const DEFAULT_MISSION = { id: "1", difficulty: 4 } as const;

export type Occupant = {
	playerId: string;
	displayName: string;
	connected: boolean;
	ready: boolean;
};

export type TableStatus = "lobby" | "playing" | "done";

export type TableState = {
	code: string;
	hostPlayerId: string;
	playerCount: PlayerCount;
	status: TableStatus;
	seq: number;
	seats: Array<Occupant | null>;
	engine: EngineState | null;
};

type TableOk = {
	ok: true;
	state: TableState;
	facts: Fact[];
	reconnect: boolean;
};

type TableErr = {
	ok: false;
	state: TableState;
	code: RoomErrorCode;
	message: string;
	reconnect: false;
};

type TableResult = TableOk | TableErr;

type StartOptions = {
	seed?: number;
	attemptId?: string;
};

export type RoomSummary = {
	occupancy: number;
	status: TableStatus;
	playerCount: PlayerCount;
	playerIds: string[];
};

export function createTable(input: {
	code: string;
	hostPlayerId: string;
	playerCount: PlayerCount;
}): TableState {
	return {
		code: input.code,
		hostPlayerId: input.hostPlayerId,
		playerCount: input.playerCount,
		status: "lobby",
		seq: 0,
		seats: Array.from({ length: input.playerCount }, () => null),
		engine: null,
	};
}

export function summary(state: TableState): RoomSummary {
	const playerIds = state.seats.flatMap((seat) => (seat === null ? [] : [seat.playerId]));
	return {
		occupancy: playerIds.length,
		status: state.status,
		playerCount: state.playerCount,
		playerIds,
	};
}

export function seatOf(state: TableState, playerId: string): SeatId | null {
	const index = state.seats.findIndex((seat) => seat?.playerId === playerId);
	return index === -1 ? null : (index as SeatId);
}

function occupancyOf(state: TableState): Occupancy {
	return state.seats.map((seat) =>
		seat === null
			? null
			: {
					playerId: seat.playerId,
					displayName: seat.displayName,
					connected: seat.connected,
					ready: seat.ready,
				},
	);
}

export function viewForSeat(state: TableState, viewerSeat: SeatId): TableView {
	if (state.engine === null) {
		return projectLobby(
			occupancyOf(state),
			viewerSeat,
			state.seq,
			seatOf(state, state.hostPlayerId),
		);
	}
	return {
		...project(state.engine, viewerSeat, occupancyOf(state), seatOf(state, state.hostPlayerId)),
		seq: state.seq,
	};
}

export function snapshotMessage(state: TableState, viewerSeat: SeatId): SnapshotEnvelope {
	return {
		type: "room.snapshot",
		attemptId: state.engine?.attemptId ?? null,
		seq: state.seq,
		viewModel: viewForSeat(state, viewerSeat),
	};
}

export function factsForSeat(facts: readonly Fact[], viewerSeat: SeatId): Fact[] {
	return projectFacts(facts, viewerSeat);
}

export function connect(state: TableState, playerId: string, displayName: string): TableResult {
	const existing = seatOf(state, playerId);
	if (existing !== null) {
		const seats = cloneSeats(state);
		const occupant = seats[existing];
		if (occupant === undefined || occupant === null) {
			return fail(state, "notSeated", "not seated");
		}
		const wasDisconnected = !occupant.connected;
		occupant.displayName = displayName;
		occupant.connected = true;
		const next = { ...state, seats };
		if (!wasDisconnected) {
			return succeed(next, [], true);
		}
		const pushed = pushFact(next, {
			type: "player.connection",
			attemptId: attemptIdOf(next),
			seatId: existing,
			connected: true,
		});
		return succeed(pushed.state, [pushed.fact], true);
	}

	if (state.status !== "lobby") {
		return fail(state, "alreadyStarted", "game already started");
	}

	const empty = state.seats.indexOf(null);
	if (empty === -1) {
		return fail(state, "roomFull", "no empty seat");
	}

	const seats = cloneSeats(state);
	seats[empty] = { playerId, displayName, connected: true, ready: false };
	const pushed = pushFact(
		{ ...state, seats },
		{
			type: "player.sat",
			attemptId: null,
			seatId: empty as SeatId,
			playerId,
			displayName,
		},
	);
	return succeed(pushed.state, [pushed.fact], false);
}

export function disconnect(state: TableState, playerId: string): TableResult {
	const seatId = seatOf(state, playerId);
	if (seatId === null) {
		return succeed(state, [], false);
	}
	const seats = cloneSeats(state);
	const occupant = seats[seatId];
	if (occupant === undefined || occupant === null || !occupant.connected) {
		return succeed(state, [], false);
	}
	occupant.connected = false;
	const pushed = pushFact(
		{ ...state, seats },
		{
			type: "player.connection",
			attemptId: attemptIdOf(state),
			seatId,
			connected: false,
		},
	);
	return succeed(pushed.state, [pushed.fact], false);
}

export function handleIntent(
	state: TableState,
	playerId: string,
	intent: Intent,
	options?: StartOptions,
): TableResult {
	if (intent.type === "echo") {
		return fail(state, "illegalIntent", "echo is not a play intent");
	}

	const seatId = seatOf(state, playerId);
	if (seatId === null) {
		return fail(state, "notSeated", "sit before acting");
	}

	if (intent.type === "player.ready") {
		return setReady(state, seatId, intent.ready);
	}
	if (intent.type === "host.start") {
		return start(state, playerId, options);
	}
	if (intent.type === "host.retry") {
		return retry(state, playerId, options);
	}
	return play(state, seatId, intent);
}

function setReady(state: TableState, seatId: SeatId, ready: boolean): TableResult {
	if (state.status !== "lobby") {
		return fail(state, "alreadyStarted", "game already started");
	}
	const seats = cloneSeats(state);
	const occupant = seats[seatId];
	if (occupant === undefined || occupant === null) {
		return fail(state, "notSeated", "sit before acting");
	}
	occupant.ready = ready;
	const pushed = pushFact(
		{ ...state, seats },
		{
			type: "player.ready",
			attemptId: null,
			seatId,
			ready,
		},
	);
	return succeed(pushed.state, [pushed.fact], false);
}

function start(state: TableState, playerId: string, options?: StartOptions): TableResult {
	if (playerId !== state.hostPlayerId) {
		return fail(state, "notHost", "only the host can start");
	}
	if (state.status !== "lobby") {
		return fail(state, "alreadyStarted", "game already started");
	}
	if (state.seats.some((seat) => seat === null || !seat.ready)) {
		return fail(state, "notReady", "every seat must be filled and ready");
	}

	return beginAttempt(state, options);
}

function retry(state: TableState, playerId: string, options?: StartOptions): TableResult {
	if (playerId !== state.hostPlayerId) {
		return fail(state, "notHost", "only the host can retry");
	}
	if (state.engine === null || state.status === "lobby") {
		return fail(state, "wrongPhase", "game has not started");
	}
	if (state.engine.phase !== "result") {
		return fail(state, "alreadyStarted", "mission is still in progress");
	}

	return beginAttempt(state, options);
}

function beginAttempt(state: TableState, options?: StartOptions): TableResult {
	const attemptId = options?.attemptId ?? crypto.randomUUID();
	const seed = options?.seed ?? randomSeed();
	const created = createAttempt({
		attemptId,
		mission: { id: DEFAULT_MISSION.id, difficulty: DEFAULT_MISSION.difficulty },
		playerCount: state.playerCount,
		seed,
	});
	const started = pushFact(
		{ ...state, status: "playing", engine: created.state },
		{
			type: "host.started",
			attemptId,
			missionId: DEFAULT_MISSION.id,
		},
	);
	const stamped = stampFacts(started.state, created.facts);
	return succeed(stamped.state, [started.fact, ...stamped.facts], false);
}

function play(state: TableState, seatId: SeatId, intent: PlayIntent): TableResult {
	if (state.engine === null || state.status === "lobby") {
		return fail(state, "wrongPhase", "game has not started");
	}
	const forced: PlayIntent = {
		...intent,
		seatId,
		attemptId: state.engine.attemptId,
	};
	const result = apply(state.engine, forced);
	if (!result.ok) {
		return fail(state, result.error, result.error);
	}
	const stamped = stampFacts({ ...state, engine: result.state }, result.facts);
	return succeed(stamped.state, stamped.facts, false);
}

function randomSeed(): number {
	const bytes = new Uint32Array(1);
	crypto.getRandomValues(bytes);
	return bytes[0] ?? 1;
}

function attemptIdOf(state: TableState): string | null {
	return state.engine?.attemptId ?? null;
}

function cloneSeats(state: TableState): Array<Occupant | null> {
	return state.seats.map((seat) => (seat === null ? null : { ...seat }));
}

function pushFact<T extends Omit<Fact, "seq">>(
	state: TableState,
	fact: T,
): { state: TableState; fact: T & { seq: number } } {
	const seq = state.seq + 1;
	return { state: { ...state, seq }, fact: { ...fact, seq } };
}

function stampFacts(state: TableState, facts: Fact[]): { state: TableState; facts: Fact[] } {
	let seq = state.seq;
	const stamped = facts.map((fact) => {
		seq += 1;
		return { ...fact, seq };
	});
	return { state: { ...state, seq }, facts: stamped };
}

function succeed(state: TableState, facts: Fact[], reconnect: boolean): TableOk {
	return { ok: true, state, facts, reconnect };
}

function fail(state: TableState, code: RoomErrorCode, message: string): TableErr {
	return { ok: false, state, code, message, reconnect: false };
}
