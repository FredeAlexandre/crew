import type {
	AttemptId,
	CardId,
	DistressDirection,
	Fact,
	IllegalReason,
	Intent,
	MissionId,
	SeatId,
	SonarPosition,
	Suit,
	TaskInstanceId,
	TaskPublic,
} from "@crew/protocol";

export type Phase = "taskDraft" | "distressOffer" | "distressPass" | "play" | "trick" | "result";

export type PlayerCount = 3 | 4 | 5;

export type MissionFlags = {
	readonly sonarDisabled?: boolean;
	readonly discussionAllowed?: boolean;
};

export type MissionDef = {
	readonly id: MissionId;
	readonly difficulty: number;
	readonly flags?: MissionFlags;
};

export type TrickPlay = {
	seatId: SeatId;
	cardId: CardId;
};

export type LastTrick = {
	trickId: number;
	winnerSeat: SeatId;
	ledSuit: Suit;
	cards: TrickPlay[];
};

export type SonarSlot = {
	available: boolean;
	communication: { cardId: CardId; position: SonarPosition } | null;
};

export type TaskStatus = "open" | "completed" | "failed";

export type TaskInstance = {
	instanceId: TaskInstanceId;
	ownerSeat: SeatId | null;
	status: TaskStatus;
	progress: number;
	spec: TaskPublic;
};

export type EngineState = {
	version: 1;
	phase: Phase;
	attemptId: AttemptId;
	seq: number;
	rng: number;
	playerCount: number;
	mission: MissionDef | null;
	hands: CardId[][];
	captainSeat: SeatId | null;
	trickId: number;
	currentSeat: SeatId | null;
	ledSuit: Suit | null;
	currentTrick: TrickPlay[];
	lastTrick: LastTrick | null;
	tricksWon: number[][];
	captured: CardId[][];
	consecutiveWins: number[];
	sonar: SonarSlot[];
	distressActive: boolean;
	distressDirection: DistressDirection | null;
	distressPassed: (CardId | null)[];
	tasks: TaskInstance[];
	centerTaskIds: TaskInstanceId[];
	passAllowed: boolean;
	draftActs: number;
	nextInstance: number;
	taskDrawPile: TaskPublic["id"][];
	result: "won" | "failed" | null;
	failReason: string | null;
};

export type ApplyOk = {
	ok: true;
	state: EngineState;
	facts: Fact[];
};

export type ApplyErr = {
	ok: false;
	error: IllegalReason;
};

export type ApplyResult = ApplyOk | ApplyErr;

export function cloneState(state: EngineState): EngineState {
	return structuredClone(state);
}

export function isPlayIntent(intent: Intent): intent is Exclude<Intent, { type: "echo" }> {
	return intent.type !== "echo";
}
