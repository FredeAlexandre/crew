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
	type HostConfigureIntent,
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
	distressDisabled: true,
	completedTricksVisible: true,
};
const BOT_PLAYER_PREFIX = "bot:";
const KICK_COOLDOWN_MS = 10_000;

export type Occupant = {
	playerId: string;
	displayName: string;
	image?: string | null;
	connected: boolean;
	leaving?: boolean;
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
	/** Server-only authoritative facts for the current attempt, retained for history persistence. */
	historyFacts: Fact[];
	/** Wall-clock start retained for the history record; absent on tables created before this field. */
	historyStartedAt?: number;
	/** Kept after a seat is vacated so repeat kicks lengthen the reconnect delay. */
	kicks: Record<string, { count: number; blockedUntil: number }>;
	leavingUntil?: Record<string, number>;
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
		historyFacts: [],
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
					...(seat.leaving === true ? { leaving: true } : {}),
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
		delete occupant.leaving;
		const leavingUntil = { ...(state.leavingUntil ?? {}) };
		delete leavingUntil[playerId];
		const next = { ...state, seats, leavingUntil };
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
	if (intent.type === "player.leave") {
		return leave(state, playerId);
	}
	if (intent.type === "player.rename") {
		return renamePlayer(state, seatId, intent.displayName);
	}
	if (intent.type === "host.start") {
		return start(state, playerId, options);
	}
	if (intent.type === "host.configure") {
		return configure(state, playerId, intent);
	}
	if (intent.type === "host.retry") {
		return retry(state, playerId, intent.keepTasks === true, options);
	}
	if (intent.type === "host.fillBots") {
		return fillBots(state, playerId, intent.seatId);
	}
	if (intent.type === "host.kick") {
		return kick(state, playerId, intent.seatId, options?.now);
	}
	return play(state, seatId, intent);
}

const LEAVE_DELAY_MS = 2_000;

function leave(state: TableState, playerId: string, now = Date.now()): TableResult {
	const seatId = seatOf(state, playerId);
	if (seatId === null) return succeed(state, [], false);
	const occupant = state.seats[seatId];
	if (occupant === null || occupant === undefined || !occupant.connected) {
		return succeed(state, [], false);
	}
	const seats = cloneSeats(state);
	const nextOccupant = seats[seatId];
	if (nextOccupant === null || nextOccupant === undefined) return succeed(state, [], false);
	nextOccupant.connected = false;
	nextOccupant.leaving = true;
	return succeed(
		{
			...state,
			seats,
			seq: state.seq + 1,
			leavingUntil: { ...(state.leavingUntil ?? {}), [playerId]: now + LEAVE_DELAY_MS },
		},
		[],
		false,
	);
}

export function removeLeaving(state: TableState, now = Date.now()): TableState {
	const leavingUntil = state.leavingUntil ?? {};
	const seats = cloneSeats(state);
	const nextLeaving = { ...leavingUntil };
	let changed = false;
	for (const [playerId, until] of Object.entries(leavingUntil)) {
		if (until > now) continue;
		const seatId = seatOf(state, playerId);
		if (seatId !== null && seats[seatId]?.leaving === true) {
			seats[seatId] = null;
			changed = true;
		}
		delete nextLeaving[playerId];
	}
	if (!changed && Object.keys(nextLeaving).length === Object.keys(leavingUntil).length)
		return state;
	return { ...state, seats, leavingUntil: nextLeaving, seq: state.seq + 1 };
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
	if (occupant === undefined || occupant === null) {
		return fail(state, "notSeated", "seat has no player to remove");
	}
	if (occupant.playerId === state.hostPlayerId) {
		return fail(state, "illegalIntent", "the host cannot remove themself");
	}
	const seats = cloneSeats(state);
	seats[seatId] = null;
	if (isBotPlayerId(occupant.playerId)) {
		return succeed({ ...state, seats }, [], false);
	}
	const prior = state.kicks?.[occupant.playerId]?.count ?? 0;
	const count = prior + 1;
	const cooldown = KICK_COOLDOWN_MS * 2 ** (count - 1);
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

function configure(state: TableState, playerId: string, intent: HostConfigureIntent): TableResult {
	if (playerId !== state.hostPlayerId) {
		return fail(state, "notHost", "only the host can configure the table");
	}
	if (state.status !== "lobby") {
		return fail(state, "alreadyStarted", "game already started");
	}

	const nextPlayerCount = intent.playerCount ?? state.playerCount;
	const resized = resizeSeats(state, nextPlayerCount);
	if (!resized.ok) {
		return fail(state, resized.code, resized.message);
	}

	let captainSeat = intent.captainSeat;
	if (captainSeat !== null && captainSeat >= nextPlayerCount) {
		if (intent.playerCount !== undefined && intent.playerCount !== state.playerCount) {
			captainSeat = null;
		} else {
			return fail(state, "illegalSeat", "captain seat is not at this table");
		}
	}

	const setup = setupOf(state);
	if (
		setup.difficulty === intent.difficulty &&
		setup.captainSeat === captainSeat &&
		setup.distressDisabled === intent.distressDisabled &&
		setup.completedTricksVisible === intent.completedTricksVisible &&
		state.playerCount === nextPlayerCount
	) {
		return succeed(state, [], false);
	}

	const nextSetup = {
		difficulty: intent.difficulty,
		captainSeat,
		distressDisabled: intent.distressDisabled,
		completedTricksVisible: intent.completedTricksVisible,
	};
	const pushed = pushFact(
		{
			...state,
			playerCount: nextPlayerCount,
			seats: resized.seats,
			setup: nextSetup,
		},
		{
			type: "host.configured",
			attemptId: null,
			difficulty: nextSetup.difficulty,
			captainSeat: nextSetup.captainSeat,
			distressDisabled: nextSetup.distressDisabled,
			completedTricksVisible: nextSetup.completedTricksVisible,
			playerCount: nextPlayerCount,
		},
	);
	return succeed(pushed.state, [pushed.fact], false);
}

function resizeSeats(
	state: TableState,
	playerCount: PlayerCount,
):
	| { ok: true; seats: Array<Occupant | null> }
	| { ok: false; code: RoomErrorCode; message: string } {
	if (playerCount === state.playerCount) {
		return { ok: true, seats: state.seats };
	}
	if (playerCount > state.playerCount) {
		return {
			ok: true,
			seats: [
				...state.seats,
				...Array.from({ length: playerCount - state.playerCount }, () => null),
			],
		};
	}
	for (let index = playerCount; index < state.playerCount; index += 1) {
		if (state.seats[index] !== null) {
			return { ok: false, code: "illegalIntent", message: "cannot drop occupied seats" };
		}
	}
	return { ok: true, seats: state.seats.slice(0, playerCount) };
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

function retry(
	state: TableState,
	playerId: string,
	keepTasks: boolean,
	options?: StartOptions,
): TableResult {
	if (playerId !== state.hostPlayerId) {
		return fail(state, "notHost", "only the host can retry");
	}
	if (state.engine === null || state.status === "lobby") {
		return fail(state, "wrongPhase", "game has not started");
	}
	if (state.engine.phase !== "result") {
		return fail(state, "alreadyStarted", "mission is still in progress");
	}

	return beginAttempt(state, options, keepTasks ? state.engine : null);
}

function beginAttempt(
	state: TableState,
	options?: StartOptions,
	reuse?: EngineState | null,
): TableResult {
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
		...(reuse
			? {
					tasks: reuse.tasks.map((task) => task.spec),
					taskDrawPile: reuse.taskDrawPile,
				}
			: {}),
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

function nextBotNumber(state: TableState): number {
	let count = 0;
	for (const occupant of state.seats) {
		if (occupant !== null && occupant !== undefined && isBotPlayerId(occupant.playerId)) {
			count += 1;
		}
	}
	return count + 1;
}

function fillOneBot(
	state: TableState,
	seatId: SeatId,
	botNumber: number,
): { state: TableState; facts: Fact[] } {
	const botId = `${BOT_PLAYER_PREFIX}${seatId}`;
	const displayName = `Bot ${botNumber}`;
	const seats = cloneSeats(state);
	seats[seatId] = {
		playerId: botId,
		displayName,
		connected: true,
		ready: true,
	};
	const sat = pushFact(
		{ ...state, seats },
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
	return { state: readied.state, facts: [sat.fact, readied.fact] };
}

function fillBots(state: TableState, playerId: string, targetSeat?: SeatId): TableResult {
	if (playerId !== state.hostPlayerId) {
		return fail(state, "notHost", "only the host can fill bots");
	}
	if (state.status !== "lobby") {
		return fail(state, "alreadyStarted", "game already started");
	}
	if (seatOf(state, playerId) === null) {
		return fail(state, "notSeated", "sit before filling seats");
	}

	const targets: SeatId[] = [];
	if (targetSeat !== undefined) {
		if (targetSeat >= state.playerCount) {
			return fail(state, "illegalSeat", "seat is not at this table");
		}
		if (state.seats[targetSeat] !== null) {
			return fail(state, "illegalSeat", "seat is already taken");
		}
		targets.push(targetSeat);
	} else {
		for (let index = 0; index < state.seats.length; index += 1) {
			if (state.seats[index] === null) {
				targets.push(index as SeatId);
			}
		}
	}

	let next = state;
	const facts: Fact[] = [];
	let botNumber = nextBotNumber(state);
	for (const seatId of targets) {
		const filled = fillOneBot(next, seatId, botNumber);
		facts.push(...filled.facts);
		next = filled.state;
		botNumber += 1;
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
