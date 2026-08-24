import { z } from "zod";
import { cardIdSchema } from "./cards.ts";
import {
	attemptIdSchema,
	distressDirectionSchema,
	missionDifficultySchema,
	seatIdSchema,
	seqSchema,
	sonarPositionSchema,
	taskInstanceIdSchema,
} from "./ids.ts";

const playMeta = {
	attemptId: attemptIdSchema,
	seatId: seatIdSchema,
};

export const echoIntentSchema = z.object({
	type: z.literal("echo"),
	attemptId: attemptIdSchema,
	seq: seqSchema,
	payload: z.unknown(),
});

export const playerReadyIntentSchema = z.object({
	type: z.literal("player.ready"),
	ready: z.boolean(),
});

export const hostStartIntentSchema = z.object({
	type: z.literal("host.start"),
});

export const hostConfigureIntentSchema = z.object({
	type: z.literal("host.configure"),
	difficulty: missionDifficultySchema,
	captainSeat: seatIdSchema.nullable(),
	distressDisabled: z.boolean().default(false),
});

export const hostRetryIntentSchema = z.object({
	type: z.literal("host.retry"),
});

export const hostFillBotsIntentSchema = z.object({
	type: z.literal("host.fillBots"),
});

export const hostKickIntentSchema = z.object({
	type: z.literal("host.kick"),
	seatId: seatIdSchema,
});

export const taskTakeIntentSchema = z.object({
	type: z.literal("task.take"),
	...playMeta,
	taskInstanceId: taskInstanceIdSchema,
});

export const taskPassIntentSchema = z.object({
	type: z.literal("task.pass"),
	...playMeta,
});

export const distressSkipIntentSchema = z.object({
	type: z.literal("distress.skip"),
	...playMeta,
});

export const distressActivateIntentSchema = z.object({
	type: z.literal("distress.activate"),
	...playMeta,
	direction: distressDirectionSchema,
});

export const distressPassCardIntentSchema = z.object({
	type: z.literal("distress.passCard"),
	...playMeta,
	cardId: cardIdSchema,
});

export const cardPlayIntentSchema = z.object({
	type: z.literal("card.play"),
	...playMeta,
	cardId: cardIdSchema,
});

export const sonarUseIntentSchema = z.object({
	type: z.literal("sonar.use"),
	...playMeta,
	cardId: cardIdSchema,
	position: sonarPositionSchema,
});

export const intentSchema = z.discriminatedUnion("type", [
	echoIntentSchema,
	playerReadyIntentSchema,
	hostStartIntentSchema,
	hostConfigureIntentSchema,
	hostRetryIntentSchema,
	hostFillBotsIntentSchema,
	hostKickIntentSchema,
	taskTakeIntentSchema,
	taskPassIntentSchema,
	distressSkipIntentSchema,
	distressActivateIntentSchema,
	distressPassCardIntentSchema,
	cardPlayIntentSchema,
	sonarUseIntentSchema,
]);

export type EchoIntent = z.infer<typeof echoIntentSchema>;
export type PlayerReadyIntent = z.infer<typeof playerReadyIntentSchema>;
export type HostStartIntent = z.infer<typeof hostStartIntentSchema>;
export type HostConfigureIntent = z.infer<typeof hostConfigureIntentSchema>;
export type HostRetryIntent = z.infer<typeof hostRetryIntentSchema>;
export type HostFillBotsIntent = z.infer<typeof hostFillBotsIntentSchema>;
export type HostKickIntent = z.infer<typeof hostKickIntentSchema>;
export type TaskTakeIntent = z.infer<typeof taskTakeIntentSchema>;
export type TaskPassIntent = z.infer<typeof taskPassIntentSchema>;
export type DistressSkipIntent = z.infer<typeof distressSkipIntentSchema>;
export type DistressActivateIntent = z.infer<typeof distressActivateIntentSchema>;
export type DistressPassCardIntent = z.infer<typeof distressPassCardIntentSchema>;
export type CardPlayIntent = z.infer<typeof cardPlayIntentSchema>;
export type SonarUseIntent = z.infer<typeof sonarUseIntentSchema>;
export type Intent = z.infer<typeof intentSchema>;
export type LobbyIntent =
	| PlayerReadyIntent
	| HostStartIntent
	| HostConfigureIntent
	| HostRetryIntent
	| HostFillBotsIntent
	| HostKickIntent;
export type PlayIntent = Exclude<Intent, EchoIntent | LobbyIntent>;
