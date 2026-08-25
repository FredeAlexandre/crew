import {
	attemptIdSchema,
	cardIdSchema,
	distressDirectionSchema,
	illegalReasonSchema,
	missionIdSchema,
	seatIdSchema,
	seqSchema,
	sonarPositionSchema,
	suitSchema,
	taskInstanceIdSchema,
	taskPublicSchema,
	trickIdSchema,
} from "@crew/protocol";
import { z } from "zod";

export const sceneSchema = z.enum([
	"boot",
	"lobby",
	"briefing",
	"deal",
	"taskDraft",
	"play",
	"result",
	"campaign",
]);
export type Scene = z.infer<typeof sceneSchema>;

export const overlaySchema = z.enum(["none", "distress", "sonar", "lastTrick", "reminder"]);
export type Overlay = z.infer<typeof overlaySchema>;

export const seatRegionSchema = z.enum(["seat.self", "seat.1", "seat.2", "seat.3", "seat.4"]);
export type SeatRegion = z.infer<typeof seatRegionSchema>;

export const taskRegionSchema = z.enum([
	"tasks.center",
	"tasks.self",
	"tasks.1",
	"tasks.2",
	"tasks.3",
	"tasks.4",
]);
export type TaskRegion = z.infer<typeof taskRegionSchema>;

export const sonarTokenStateSchema = z.enum(["available", "used", "communicating"]);
export type SonarTokenState = z.infer<typeof sonarTokenStateSchema>;

export const communicationSchema = z.object({
	cardId: cardIdSchema,
	position: sonarPositionSchema,
});
export type Communication = z.infer<typeof communicationSchema>;

export const taskViewSchema = z.object({
	instanceId: taskInstanceIdSchema,
	spec: taskPublicSchema,
	status: z.enum(["open", "completed", "failed"]),
	progress: z.number().int().nonnegative(),
	region: taskRegionSchema,
	ownerSeatId: seatIdSchema.nullable(),
	takeable: z.boolean(),
});
export type TaskView = z.infer<typeof taskViewSchema>;

export const handCardSchema = z.object({
	cardId: cardIdSchema,
	legal: z.boolean(),
	illegalReason: illegalReasonSchema.nullable(),
	communicated: z.boolean(),
});
export type HandCard = z.infer<typeof handCardSchema>;

export const trickCardSchema = z.object({
	region: seatRegionSchema,
	seatId: seatIdSchema,
	cardId: cardIdSchema,
	order: z.number().int().positive(),
});
export type TrickCard = z.infer<typeof trickCardSchema>;

export const completedTrickViewSchema = z.object({
	trickId: trickIdSchema,
	ledSuit: suitSchema,
	cards: z.array(trickCardSchema),
});
export const seatViewSchema = z.object({
	region: seatRegionSchema,
	seatId: seatIdSchema,
	displayName: z.string().nullable(),
	/** Public account avatar, when the seated player has chosen one. */
	image: z.string().nullable().optional(),
	connected: z.boolean(),
	leaving: z.boolean().default(false),
	ready: z.boolean(),
	isCaptain: z.boolean(),
	sonar: z.object({
		state: sonarTokenStateSchema,
		communication: communicationSchema.nullable(),
	}),
	handCount: z.number().int().nonnegative(),
	wonTrickCount: z.number().int().nonnegative(),
	completedTricks: z.array(completedTrickViewSchema).default([]),
	isTurn: z.boolean(),
	isLastTrickWinner: z.boolean(),
	tasks: z.array(taskViewSchema),
});
export type SeatView = z.infer<typeof seatViewSchema>;

export const trickViewSchema = z.object({
	trickId: trickIdSchema.nullable(),
	ledSuit: suitSchema.nullable(),
	leadRegion: seatRegionSchema.nullable(),
	cards: z.array(trickCardSchema),
});
export type TrickView = z.infer<typeof trickViewSchema>;

export const lastTrickViewSchema = z.object({
	trickId: trickIdSchema,
	winnerRegion: seatRegionSchema,
	winnerSeatId: seatIdSchema,
	ledSuit: suitSchema,
	cards: z.array(trickCardSchema),
});
export type LastTrickView = z.infer<typeof lastTrickViewSchema>;

export const affordancesSchema = z.object({
	canPlay: z.boolean(),
	canSonar: z.boolean(),
	canTakeTask: z.boolean(),
	canPassTask: z.boolean(),
	canSkipDistress: z.boolean(),
	canActivateDistress: z.boolean(),
	canPassDistressCard: z.boolean(),
	canPeekLastTrick: z.boolean(),
	canStart: z.boolean(),
	canFillBots: z.boolean(),
	canConfigure: z.boolean(),
	canRetry: z.boolean(),
});
export type Affordances = z.infer<typeof affordancesSchema>;

export const chromeSchema = z.object({
	missionId: missionIdSchema.nullable(),
	difficulty: z.number().int().nonnegative().nullable(),
	trickId: trickIdSchema.nullable(),
	turnRegion: seatRegionSchema.nullable(),
	distress: z.object({
		active: z.boolean(),
		direction: distressDirectionSchema.nullable(),
	}),
	sonarAvailable: z.boolean(),
	flags: z.object({
		sonarDisabled: z.boolean(),
		discussionAllowed: z.boolean(),
		distressDisabled: z.boolean(),
		completedTricksVisible: z.boolean().default(false),
	}),
});
export type Chrome = z.infer<typeof chromeSchema>;

export const resultViewSchema = z.object({
	outcome: z.enum(["won", "failed"]),
	reason: z.string().min(1).nullable(),
});
export type ResultView = z.infer<typeof resultViewSchema>;

export const sonarCandidateSchema = z.object({
	cardId: cardIdSchema,
	position: sonarPositionSchema,
});
export type SonarCandidate = z.infer<typeof sonarCandidateSchema>;

export const tableViewSchema = z.object({
	attemptId: attemptIdSchema.nullable(),
	seq: seqSchema,
	viewerSeat: seatIdSchema,
	playerCount: z.number().int().min(0).max(5),
	scene: sceneSchema,
	overlay: overlaySchema,
	chrome: chromeSchema,
	seats: z.array(seatViewSchema),
	hand: z.array(handCardSchema),
	trick: trickViewSchema,
	centerTasks: z.array(taskViewSchema),
	lastTrick: lastTrickViewSchema.nullable(),
	/** Every completed trick, revealed only once the mission has ended. */
	history: z.array(lastTrickViewSchema).default([]),
	undealt: z.object({ present: z.boolean() }),
	sonarCandidates: z.array(sonarCandidateSchema),
	affordances: affordancesSchema,
	result: resultViewSchema.nullable(),
});
export type TableView = z.infer<typeof tableViewSchema>;

export function relativeSeat(seatId: number, viewerSeat: number, playerCount: number): number {
	return (seatId - viewerSeat + playerCount) % playerCount;
}

export function seatRegionAt(relative: number): SeatRegion {
	if (relative === 0) {
		return "seat.self";
	}
	if (relative === 1) {
		return "seat.1";
	}
	if (relative === 2) {
		return "seat.2";
	}
	if (relative === 3) {
		return "seat.3";
	}
	return "seat.4";
}

export function taskRegionAt(relative: number): TaskRegion {
	if (relative === 0) {
		return "tasks.self";
	}
	if (relative === 1) {
		return "tasks.1";
	}
	if (relative === 2) {
		return "tasks.2";
	}
	if (relative === 3) {
		return "tasks.3";
	}
	return "tasks.4";
}

export function regionForSeat(seatId: number, viewerSeat: number, playerCount: number): SeatRegion {
	return seatRegionAt(relativeSeat(seatId, viewerSeat, playerCount));
}
