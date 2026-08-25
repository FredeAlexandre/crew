import {
	apply,
	createAttempt,
	type EngineState,
	type PlayerCount,
	pickSeatIntent,
} from "@crew/engine";
import {
	DEFAULT_MISSION_DIFFICULTY,
	DEFAULT_MISSION_ID,
	type Fact,
	type Intent,
	type PlayIntent,
	type RoomErrorCode,
	type SeatId,
	type SnapshotEnvelope,
} from "@crew/protocol";
import type { TableView } from "@crew/view-model";
import { type Occupancy, project, projectFacts, projectLobby } from "@crew/view-model/project";

const DEFAULT_SETUP: TableSetup = {
	difficulty: DEFAULT_MISSION_DIFFICULTY,
	captainSeat: null,
	distressDisabled: false,
	completedTricksVisible: false,
};
const BOT_PLAYER_PREFIX = "bot:";
const KICK_COOLDOWN_MS = 10_000;

export type Occupant = {
	playerId: string;
	displayName: string;
	image?: string | null;
	connected: boolean;
	ready: boolean;
};

export type TableStatus = "lobby" | "playing" | "done";

export type TableSetup = {
	difficulty: number;
	captainSeat: SeatId | null;
	distressDisabled: boolean;
	completedTricksVisible: boolean;
};

export type TableState = {
	code: string;
	hostPlayerId: string;
	playerCount: PlayerCount;
	status: TableStatus;
	seq: number;
	seats: Array<Occupant | null>;
	setup: TableSetup;
	engine: EngineState | null;
	/** Kept after a seat is vacated so repeat kicks lengthen the reconnect delay. */
	kicks: Record<string, { count: number; blockedUntil: number }>;
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
	now?: number;
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
		setup: { ...DEFAULT_SETUP },
		engine: null,
		kicks: {},
	};
}

export function reconnectBlockedUntil(
	state: TableState,
	playerId: string,
	now = Date.now(),
): number | null {
	const blockedUntil = state.kicks?.[playerId]?.blockedUntil;
	return blockedUntil !== undefined && blockedUntil > now ? blockedUntil : null;
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

export function isBotPlayerId(playerId: string): boolean {
	return playerId.startsWith(BOT_PLAYER_PREFIX);
}

function occupancyOf(state: TableState): Occupancy {
	return state.seats.map((seat) =>
		seat === null
			? null
			: {
					playerId: seat.playerId,
					displayName: seat.displayName,
					...(seat.image ? { image: seat.image } : {}),
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
			setupOf(state),
		);
	}
	return {
		...project(
			state.engine,
			viewerSeat,
			occupancyOf(state),
			seatOf(state, state.hostPlayerId),
			setupOf(state).completedTricksVisible,
		),
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

export function connect(
	state: TableState,
	playerId: string,
	displayName: string,
	image?: string | null,
): TableResult {
	const blockedUntil = reconnectBlockedUntil(state, playerId);
	if (blockedUntil !== null) {
		return fail(
			state,
			"reconnectBlocked",
			`you were kicked; try again in ${Math.ceil((blockedUntil - Date.now()) / 1000)} seconds`,
		);
	}
	const existing = seatOf(state, playerId);
	if (existing !== null) {
		const seats = cloneSeats(state);
		const occupant = seats[existing];
		if (occupant === undefined || occupant === null) {
			return fail(state, "notSeated", "not seated");
		}
		const wasDisconnected = !occupant.connected;
		occupant.displayName = displayName;
		if (image !== undefined) {
			occupant.image = image;
		}
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

	if (isBotPlayerId(playerId)) {
		return fail(state, "illegalIntent", "reserved seat");
	}

	const empty = state.seats.indexOf(null);
	if (empty === -1) {
		return fail(state, "roomFull", "no empty seat");
	}

	const seats = cloneSeats(state);
	seats[empty] = {
		playerId,
		displayName,
		...(image === undefined ? {} : { image }),
		connected: true,
		ready: false,
	};
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
	if (intent.type === "player.rename") {
		return renamePlayer(state, seatId, intent.displayName);
	}
	if (intent.type === "host.start") {
		return start(state, playerId, options);
	}
	if (intent.type === "host.configure") {
		return configure(
			state,
			playerId,
			intent.difficulty,
			intent.captainSeat,
			intent.distressDisabled,
			intent.completedTricksVisible,
		);
	}
	if (intent.type === "host.retry") {
		return retry(state, playerId, options);
	}
	if (intent.type === "host.fillBots") {
		return fillBots(state, playerId);
	}
	if (intent.type === "host.kick") {
		return kick(state, playerId, intent.seatId, options?.now);
	}
	return play(state, seatId, intent);
}

function kick(state: TableState, playerId: string, seatId: SeatId, now = Date.now()): TableResult {
	if (playerId !== state.hostPlayerId) {
		return fail(state, "notHost", "only the host can remove players");
	}
	if (state.status !== "lobby") {
		return fail(state, "wrongPhase", "players can only be removed in the lobby");
	}
	if (seatId >= state.playerCount) {
		return fail(state, "illegalSeat", "seat is not at this table");
	}
	const occupant = state.seats[seatId];
	if (occupant === undefined || occupant === null || isBotPlayerId(occupant.playerId)) {
		return fail(state, "notSeated", "seat has no player to remove");
	}
	if (occupant.playerId === state.hostPlayerId) {
		return fail(state, "illegalIntent", "the host cannot remove themself");
	}
	const prior = state.kicks?.[occupant.playerId]?.count ?? 0;
	const count = prior + 1;
	const cooldown = KICK_COOLDOWN_MS * 2 ** (count - 1);
	const seats = cloneSeats(state);
	seats[seatId] = null;
	return succeed(
		{
			...state,
			seats,
			kicks: {
				...(state.kicks ?? {}),
				[occupant.playerId]: { count, blockedUntil: now + cooldown },
			},
		},
		[],
		false,
	);
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

function renamePlayer(state: TableState, seatId: SeatId, displayName: string): TableResult {
	if (state.status !== "lobby") {
		return fail(state, "alreadyStarted", "game already started");
	}
	const seats = cloneSeats(state);
	const occupant = seats[seatId];
	if (occupant === undefined || occupant === null) {
		return fail(state, "notSeated", "sit before acting");
	}
	if (occupant.displayName === displayName) {
		return succeed(state, [], false);
	}
	occupant.displayName = displayName;
	const pushed = pushFact(
		{ ...state, seats },
		{
			type: "player.renamed",
			attemptId: null,
			seatId,
			displayName,
		},
	);
	return succeed(pushed.state, [pushed.fact], false);
}

function configure(
	state: TableState,
	playerId: string,
	difficulty: number,
	captainSeat: SeatId | null,
	distressDisabled: boolean,
	completedTricksVisible: boolean,
): TableResult {
	if (playerId !== state.hostPlayerId) {
		return fail(state, "notHost", "only the host can configure the table");
	}
	if (state.status !== "lobby") {
		return fail(state, "alreadyStarted", "game already started");
	}
	if (captainSeat !== null && captainSeat >= state.playerCount) {
		return fail(state, "illegalSeat", "captain seat is not at this table");
	}

	const setup = setupOf(state);
	if (
		setup.difficulty === difficulty &&
		setup.captainSeat === captainSeat &&
		setup.distressDisabled === distressDisabled &&
		setup.completedTricksVisible === completedTricksVisible
	) {
		return succeed(state, [], false);
	}

	const pushed = pushFact(
		{ ...state, setup: { difficulty, captainSeat, distressDisabled, completedTricksVisible } },
		{
			type: "host.configured",
			attemptId: null,
			difficulty,
			captainSeat,
			distressDisabled,
			completedTricksVisible,
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
	const setup = setupOf(state);
	const created = createAttempt({
		attemptId,
		mission: {
			id: DEFAULT_MISSION_ID,
			difficulty: setup.difficulty,
			flags: setup.distressDisabled ? { distressDisabled: true } : undefined,
		},
		playerCount: state.playerCount,
		seed,
		captainSeat: setup.captainSeat,
	});
	const started = pushFact(
		{ ...state, status: "playing", engine: created.state },
		{
			type: "host.started",
			attemptId,
			missionId: DEFAULT_MISSION_ID,
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

function fillBots(state: TableState, playerId: string): TableResult {
	if (playerId !== state.hostPlayerId) {
		return fail(state, "notHost", "only the host can fill bots");
	}
	if (state.status !== "lobby") {
		return fail(state, "alreadyStarted", "game already started");
	}
	if (seatOf(state, playerId) === null) {
		return fail(state, "notSeated", "sit before filling seats");
	}

	let next = state;
	const facts: Fact[] = [];
	let botNumber = 1;
	for (let index = 0; index < next.seats.length; index += 1) {
		if (next.seats[index] !== null) {
			continue;
		}
		const seatId = index as SeatId;
		const botId = `${BOT_PLAYER_PREFIX}${seatId}`;
		const displayName = `Bot ${botNumber}`;
		botNumber += 1;
		const seats = cloneSeats(next);
		seats[index] = {
			playerId: botId,
			displayName,
			connected: true,
			ready: true,
		};
		const sat = pushFact(
			{ ...next, seats },
			{
				type: "player.sat",
				attemptId: null,
				seatId,
				playerId: botId,
				displayName,
			},
		);
		const readied = pushFact(sat.state, {
			type: "player.ready",
			attemptId: null,
			seatId,
			ready: true,
		});
		facts.push(sat.fact, readied.fact);
		next = readied.state;
	}

	return succeed(next, facts, false);
}

export function playBotTurn(state: TableState): TableResult {
	if (state.engine === null) {
		return fail(state, "wrongPhase", "game has not started");
	}
	const seat = state.engine.currentSeat;
	if (seat === null) {
		return fail(state, "wrongPhase", "no bot turn is available");
	}
	const occupant = state.seats[seat];
	if (occupant === null || occupant === undefined || !isBotPlayerId(occupant.playerId)) {
		return fail(state, "notYourTurn", "the current seat is not a bot");
	}
	const intent = pickSeatIntent(state.engine, seat);
	if (intent === null) {
		return fail(state, "illegalIntent", "bot has no supported action");
	}
	const result = apply(state.engine, {
		...intent,
		seatId: seat,
		attemptId: state.engine.attemptId,
	});
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

function setupOf(state: TableState): TableSetup {
	const setup = state.setup ?? DEFAULT_SETUP;
	return {
		difficulty: setup.difficulty,
		captainSeat: setup.captainSeat,
		distressDisabled: setup.distressDisabled === true,
		completedTricksVisible: setup.completedTricksVisible === true,
	};
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
