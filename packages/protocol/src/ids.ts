import { z } from "zod";

export const playerIdSchema = z.string().min(1);
export const attemptIdSchema = z.string().min(1);
export const roomIdSchema = z.string().min(1);
export const seqSchema = z.number().int().nonnegative();
export const seatIdSchema = z.number().int().min(0).max(4);
export const taskIdSchema = z.string().min(1);
export const taskInstanceIdSchema = z.string().min(1);
export const missionIdSchema = z.string().min(1);
export const trickIdSchema = z.number().int().positive();

export const MISSION_DIFFICULTY_MIN = 1;
export const MISSION_DIFFICULTY_MAX = 16;
export const DEFAULT_MISSION_DIFFICULTY = 4;
export const DEFAULT_MISSION_ID = "1";
export const missionDifficultySchema = z
	.number()
	.int()
	.min(MISSION_DIFFICULTY_MIN)
	.max(MISSION_DIFFICULTY_MAX);

export type PlayerId = z.infer<typeof playerIdSchema>;
export type AttemptId = z.infer<typeof attemptIdSchema>;
export type RoomId = z.infer<typeof roomIdSchema>;
export type Seq = z.infer<typeof seqSchema>;
export type SeatId = z.infer<typeof seatIdSchema>;
export type TaskId = z.infer<typeof taskIdSchema>;
export type TaskInstanceId = z.infer<typeof taskInstanceIdSchema>;
export type MissionId = z.infer<typeof missionIdSchema>;
export type TrickId = z.infer<typeof trickIdSchema>;

export const colorSuitSchema = z.enum(["pink", "yellow", "green", "blue"]);
export const suitSchema = z.enum(["pink", "yellow", "green", "blue", "submarine"]);
export const sonarPositionSchema = z.enum(["highest", "only", "lowest"]);
export const distressDirectionSchema = z.enum(["left", "right"]);

export type ColorSuit = z.infer<typeof colorSuitSchema>;
export type Suit = z.infer<typeof suitSchema>;
export type SonarPosition = z.infer<typeof sonarPositionSchema>;
export type DistressDirection = z.infer<typeof distressDirectionSchema>;
