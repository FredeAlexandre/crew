import { z } from "zod";
import { cardIdSchema } from "./cards.ts";
import {
	attemptIdSchema,
	distressDirectionSchema,
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
export type TaskTakeIntent = z.infer<typeof taskTakeIntentSchema>;
export type TaskPassIntent = z.infer<typeof taskPassIntentSchema>;
export type DistressSkipIntent = z.infer<typeof distressSkipIntentSchema>;
export type DistressActivateIntent = z.infer<typeof distressActivateIntentSchema>;
export type DistressPassCardIntent = z.infer<typeof distressPassCardIntentSchema>;
export type CardPlayIntent = z.infer<typeof cardPlayIntentSchema>;
export type SonarUseIntent = z.infer<typeof sonarUseIntentSchema>;
export type Intent = z.infer<typeof intentSchema>;
export type LobbyIntent = PlayerReadyIntent | HostStartIntent;
export type PlayIntent = Exclude<Intent, EchoIntent | LobbyIntent>;
