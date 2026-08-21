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
