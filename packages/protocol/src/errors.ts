import { z } from "zod";

export const illegalReasonSchema = z.enum([
	"notYourTurn",
	"wrongPhase",
	"wrongAttempt",
	"mustFollowSuit",
	"cardNotInHand",
	"sonarAlreadyUsed",
	"sonarDisabled",
	"sonarSubmarine",
	"sonarNotExtreme",
	"sonarDuringTrick",
	"cannotPassTask",
	"cannotTakeTask",
	"captainMayNotSelect",
	"taskNotAvailable",
	"cannotPassSubmarine",
	"alreadyPassedCard",
	"unknownIntent",
	"missionOver",
	"illegalSeat",
]);

export type IllegalReason = z.infer<typeof illegalReasonSchema>;

export const roomRuleErrorCodeSchema = z.enum([
	"unauthenticated",
	"unknownRoom",
	"roomFull",
	"notSeated",
	"notHost",
	"notReady",
	"alreadyStarted",
	"illegalIntent",
	"reconnectBlocked",
]);

export const roomErrorCodeSchema = z.union([roomRuleErrorCodeSchema, illegalReasonSchema]);

export type RoomRuleErrorCode = z.infer<typeof roomRuleErrorCodeSchema>;
export type RoomErrorCode = z.infer<typeof roomErrorCodeSchema>;
