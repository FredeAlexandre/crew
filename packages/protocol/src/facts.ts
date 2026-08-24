import { z } from "zod";
import { cardIdSchema } from "./cards.ts";
import {
	attemptIdSchema,
	distressDirectionSchema,
	missionDifficultySchema,
	missionIdSchema,
	playerIdSchema,
	seatIdSchema,
	seqSchema,
	sonarPositionSchema,
	suitSchema,
	taskInstanceIdSchema,
	trickIdSchema,
} from "./ids.ts";
import { taskPublicSchema } from "./tasks.ts";

const wireMeta = {
	attemptId: attemptIdSchema,
	seq: seqSchema,
};

export const echoFactSchema = z.object({
	type: z.literal("echo"),
	...wireMeta,
	payload: z.unknown(),
});

const tableLifeMeta = {
	attemptId: attemptIdSchema.nullable(),
	seq: seqSchema,
};

const playerSatFactSchema = z.object({
	type: z.literal("player.sat"),
	...tableLifeMeta,
	seatId: seatIdSchema,
	playerId: playerIdSchema,
	displayName: z.string(),
});

const playerReadyFactSchema = z.object({
	type: z.literal("player.ready"),
	...tableLifeMeta,
	seatId: seatIdSchema,
	ready: z.boolean(),
});

const playerConnectionFactSchema = z.object({
	type: z.literal("player.connection"),
	...tableLifeMeta,
	seatId: seatIdSchema,
	connected: z.boolean(),
});

const hostStartedFactSchema = z.object({
	type: z.literal("host.started"),
	...tableLifeMeta,
	missionId: missionIdSchema,
});

const hostConfiguredFactSchema = z.object({
	type: z.literal("host.configured"),
	...tableLifeMeta,
	difficulty: missionDifficultySchema,
	captainSeat: seatIdSchema.nullable(),
});

const cardDealtFactSchema = z.object({
	type: z.literal("card.dealt"),
	...wireMeta,
	seatId: seatIdSchema,
	cardId: cardIdSchema.optional(),
	index: z.number().int().nonnegative(),
	handCount: z.number().int().nonnegative(),
});

const captainRevealedFactSchema = z.object({
	type: z.literal("captain.revealed"),
	...wireMeta,
	seatId: seatIdSchema,
});

const tasksDrawnFactSchema = z.object({
	type: z.literal("tasks.drawn"),
	...wireMeta,
	tasks: z.array(
		z.object({
			taskInstanceId: taskInstanceIdSchema,
			task: taskPublicSchema,
		}),
	),
});

const taskOfferedTurnFactSchema = z.object({
	type: z.literal("task.offeredTurn"),
	...wireMeta,
	seatId: seatIdSchema,
});

const taskTakenFactSchema = z.object({
	type: z.literal("task.taken"),
	...wireMeta,
	taskInstanceId: taskInstanceIdSchema,
	seatId: seatIdSchema,
});

const taskPassedFactSchema = z.object({
	type: z.literal("task.passed"),
	...wireMeta,
	seatId: seatIdSchema,
});

const taskReplacedFactSchema = z.object({
	type: z.literal("task.replaced"),
	...wireMeta,
	oldTaskInstanceId: taskInstanceIdSchema,
	newTaskInstanceId: taskInstanceIdSchema,
	task: taskPublicSchema,
});

const draftCompletedFactSchema = z.object({
	type: z.literal("draft.completed"),
	...wireMeta,
});

const distressOfferedFactSchema = z.object({
	type: z.literal("distress.offered"),
	...wireMeta,
});

const distressSkippedFactSchema = z.object({
	type: z.literal("distress.skipped"),
	...wireMeta,
});

const distressActivatedFactSchema = z.object({
	type: z.literal("distress.activated"),
	...wireMeta,
	direction: distressDirectionSchema,
});

const cardPassedFactSchema = z.object({
	type: z.literal("card.passed"),
	...wireMeta,
	fromSeat: seatIdSchema,
	toSeat: seatIdSchema,
	cardId: cardIdSchema.optional(),
});

const turnStartedFactSchema = z.object({
	type: z.literal("turn.started"),
	...wireMeta,
	seatId: seatIdSchema,
	trickId: trickIdSchema,
	ledSuit: suitSchema.optional(),
});

const cardPlayedFactSchema = z.object({
	type: z.literal("card.played"),
	...wireMeta,
	seatId: seatIdSchema,
	cardId: cardIdSchema,
	trickOrder: z.number().int().positive(),
});

const trickResolvedFactSchema = z.object({
	type: z.literal("trick.resolved"),
	...wireMeta,
	trickId: trickIdSchema,
	winnerSeat: seatIdSchema,
	cardIds: z.array(cardIdSchema),
	ledSuit: suitSchema,
});

const taskProgressedFactSchema = z.object({
	type: z.literal("task.progressed"),
	...wireMeta,
	taskInstanceId: taskInstanceIdSchema,
	progress: z.number().int().nonnegative(),
});

const taskCompletedFactSchema = z.object({
	type: z.literal("task.completed"),
	...wireMeta,
	taskInstanceId: taskInstanceIdSchema,
	seatId: seatIdSchema,
});

const taskFailedFactSchema = z.object({
	type: z.literal("task.failed"),
	...wireMeta,
	taskInstanceId: taskInstanceIdSchema,
	reason: z.string().min(1),
});

const sonarUsedFactSchema = z.object({
	type: z.literal("sonar.used"),
	...wireMeta,
	seatId: seatIdSchema,
	cardId: cardIdSchema,
	position: sonarPositionSchema,
});

const sonarClearedFactSchema = z.object({
	type: z.literal("sonar.cleared"),
	...wireMeta,
	seatId: seatIdSchema,
});

const missionWonFactSchema = z.object({
	type: z.literal("mission.won"),
	...wireMeta,
	missionId: missionIdSchema,
});

const missionFailedFactSchema = z.object({
	type: z.literal("mission.failed"),
	...wireMeta,
	missionId: missionIdSchema,
	reason: z.string().min(1),
});

export const factSchema = z.discriminatedUnion("type", [
	echoFactSchema,
	playerSatFactSchema,
	playerReadyFactSchema,
	playerConnectionFactSchema,
	hostStartedFactSchema,
	hostConfiguredFactSchema,
	cardDealtFactSchema,
	captainRevealedFactSchema,
	tasksDrawnFactSchema,
	taskOfferedTurnFactSchema,
	taskTakenFactSchema,
	taskPassedFactSchema,
	taskReplacedFactSchema,
	draftCompletedFactSchema,
	distressOfferedFactSchema,
	distressSkippedFactSchema,
	distressActivatedFactSchema,
	cardPassedFactSchema,
	turnStartedFactSchema,
	cardPlayedFactSchema,
	trickResolvedFactSchema,
	taskProgressedFactSchema,
	taskCompletedFactSchema,
	taskFailedFactSchema,
	sonarUsedFactSchema,
	sonarClearedFactSchema,
	missionWonFactSchema,
	missionFailedFactSchema,
]);

export type EchoFact = z.infer<typeof echoFactSchema>;
export type Fact = z.infer<typeof factSchema>;
