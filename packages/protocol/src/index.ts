import { z } from "zod";
import { roomErrorCodeSchema } from "./errors.ts";
import type { EchoFact } from "./facts.ts";
import { factSchema } from "./facts.ts";
import type { Seq } from "./ids.ts";
import { attemptIdSchema, seqSchema } from "./ids.ts";
import type { EchoIntent } from "./intents.ts";

export type { CardId } from "./cards.ts";
export {
	CARD_IDS,
	COLOR_SUITS,
	COLOR_VALUES,
	cardIdSchema,
	isColorSuit,
	SUBMARINE_VALUES,
	splitCardId,
} from "./cards.ts";
export type { IllegalReason, RoomErrorCode, RoomRuleErrorCode } from "./errors.ts";
export { illegalReasonSchema, roomErrorCodeSchema, roomRuleErrorCodeSchema } from "./errors.ts";
export type { EchoFact, Fact } from "./facts.ts";
export { echoFactSchema, factSchema } from "./facts.ts";
export type {
	AttemptId,
	ColorSuit,
	DistressDirection,
	MissionId,
	PlayerId,
	RoomId,
	SeatId,
	Seq,
	SonarPosition,
	Suit,
	TaskId,
	TaskInstanceId,
	TrickId,
} from "./ids.ts";
export {
	attemptIdSchema,
	colorSuitSchema,
	DEFAULT_MISSION_DIFFICULTY,
	DEFAULT_MISSION_ID,
	distressDirectionSchema,
	MISSION_DIFFICULTY_MAX,
	MISSION_DIFFICULTY_MIN,
	missionDifficultySchema,
	missionIdSchema,
	playerIdSchema,
	roomIdSchema,
	seatIdSchema,
	seqSchema,
	sonarPositionSchema,
	suitSchema,
	taskIdSchema,
	taskInstanceIdSchema,
	trickIdSchema,
} from "./ids.ts";
export type {
	CardPlayIntent,
	DistressActivateIntent,
	DistressPassCardIntent,
	DistressSkipIntent,
	EchoIntent,
	HostConfigureIntent,
	HostContinueIntent,
	HostFillBotsIntent,
	HostKickIntent,
	HostRetryIntent,
	HostStartIntent,
	Intent,
	LobbyIntent,
	PlayerLeaveIntent,
	PlayerReadyIntent,
	PlayerRenameIntent,
	PlayIntent,
	SonarUseIntent,
	TaskPassIntent,
	TaskPredictIntent,
	TaskTakeIntent,
} from "./intents.ts";
export {
	cardPlayIntentSchema,
	distressActivateIntentSchema,
	distressPassCardIntentSchema,
	distressSkipIntentSchema,
	echoIntentSchema,
	hostConfigureIntentSchema,
	hostContinueIntentSchema,
	hostFillBotsIntentSchema,
	hostKickIntentSchema,
	hostRetryIntentSchema,
	hostStartIntentSchema,
	intentSchema,
	playerLeaveIntentSchema,
	playerReadyIntentSchema,
	playerRenameIntentSchema,
	sonarUseIntentSchema,
	taskPassIntentSchema,
	taskPredictIntentSchema,
	taskTakeIntentSchema,
} from "./intents.ts";
export type { Logbook, LogbookStep } from "./logbook.ts";
export {
	DEEP_SEA_LOGBOOK,
	getLogbook,
	LOGBOOKS,
	logbookSchema,
	logbookStepSchema,
} from "./logbook.ts";
export type { PlayerCount, PlayMode, RoomTicket } from "./rooms.ts";
export {
	createRoomRequestSchema,
	isRoomCode,
	normalizeRoomCode,
	PLAYER_COUNTS,
	playerCountSchema,
	playModeSchema,
	ROOM_CODE_ALPHABET,
	ROOM_CODE_MAX_LENGTH,
	ROOM_CODE_MIN_LENGTH,
	roomCodeSchema,
	roomTicketSchema,
} from "./rooms.ts";
export type {
	CardCountOp,
	ConsecutiveOp,
	DifficultyByPlayers,
	RedealIf,
	TaskPublic,
} from "./tasks.ts";
export {
	cardCountOpSchema,
	consecutiveOpSchema,
	difficultyByPlayersSchema,
	redealIfSchema,
	taskPublicSchema,
} from "./tasks.ts";

export const snapshotEnvelopeSchema = z.object({
	type: z.literal("room.snapshot"),
	attemptId: attemptIdSchema.nullable(),
	seq: seqSchema,
	viewModel: z.unknown(),
});

export type SnapshotEnvelope = z.infer<typeof snapshotEnvelopeSchema>;

export const roomErrorMessageSchema = z.object({
	type: z.literal("error"),
	code: roomErrorCodeSchema,
	message: z.string(),
});

export type RoomErrorMessage = z.infer<typeof roomErrorMessageSchema>;

export const serverMessageSchema = z.union([
	factSchema,
	snapshotEnvelopeSchema,
	roomErrorMessageSchema,
]);

export type ServerMessage = z.infer<typeof serverMessageSchema>;

export function echoFact(intent: EchoIntent, seq: Seq): EchoFact {
	return {
		type: "echo",
		attemptId: intent.attemptId,
		seq,
		payload: intent.payload,
	};
}
