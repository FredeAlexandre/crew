import { z } from "zod";
import type { EchoFact } from "./facts.ts";
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
} from "./cards.ts";
export type { IllegalReason } from "./errors.ts";
export { illegalReasonSchema } from "./errors.ts";
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
	distressDirectionSchema,
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
	Intent,
	PlayIntent,
	SonarUseIntent,
	TaskPassIntent,
	TaskTakeIntent,
} from "./intents.ts";
export {
	cardPlayIntentSchema,
	distressActivateIntentSchema,
	distressPassCardIntentSchema,
	distressSkipIntentSchema,
	echoIntentSchema,
	intentSchema,
	sonarUseIntentSchema,
	taskPassIntentSchema,
	taskTakeIntentSchema,
} from "./intents.ts";
export type { DifficultyByPlayers, TaskPublic } from "./tasks.ts";
export { difficultyByPlayersSchema, taskPublicSchema } from "./tasks.ts";

export const snapshotEnvelopeSchema = z.object({
	attemptId: attemptIdSchema,
	seq: seqSchema,
	viewModel: z.unknown(),
});

export type SnapshotEnvelope = z.infer<typeof snapshotEnvelopeSchema>;

export function echoFact(intent: EchoIntent, seq: Seq): EchoFact {
	return {
		type: "echo",
		attemptId: intent.attemptId,
		seq,
		payload: intent.payload,
	};
}
