import dealMidJson from "../fixtures/deal.mid.json" with { type: "json" };
import distressOfferJson from "../fixtures/distress.offer.json" with { type: "json" };
import lobbyThreeEmptyJson from "../fixtures/lobby.threeEmpty.json" with { type: "json" };
import playMidTrickFourPlayersJson from "../fixtures/play.midTrick.fourPlayers.json" with {
	type: "json",
};
import playSonarAvailableJson from "../fixtures/play.sonarAvailable.json" with { type: "json" };
import playTwoTasksLeftJson from "../fixtures/play.twoTasksLeft.json" with { type: "json" };
import resultFailTaskImpossibleJson from "../fixtures/result.fail.taskImpossible.json" with {
	type: "json",
};
import taskDraftCaptainChoosingJson from "../fixtures/taskDraft.captainChoosing.json" with {
	type: "json",
};
import { type TableView, tableViewSchema } from "./table.ts";

export const lobbyThreeEmpty: TableView = tableViewSchema.parse(lobbyThreeEmptyJson);
export const dealMid: TableView = tableViewSchema.parse(dealMidJson);
export const taskDraftCaptainChoosing: TableView = tableViewSchema.parse(
	taskDraftCaptainChoosingJson,
);
export const distressOffer: TableView = tableViewSchema.parse(distressOfferJson);
export const playMidTrickFourPlayers: TableView = tableViewSchema.parse(
	playMidTrickFourPlayersJson,
);
export const playSonarAvailable: TableView = tableViewSchema.parse(playSonarAvailableJson);
export const playTwoTasksLeft: TableView = tableViewSchema.parse(playTwoTasksLeftJson);
export const resultFailTaskImpossible: TableView = tableViewSchema.parse(
	resultFailTaskImpossibleJson,
);

export const fixtures: Record<string, TableView> = {
	"lobby.threeEmpty": lobbyThreeEmpty,
	"deal.mid": dealMid,
	"taskDraft.captainChoosing": taskDraftCaptainChoosing,
	"distress.offer": distressOffer,
	"play.midTrick.fourPlayers": playMidTrickFourPlayers,
	"play.sonarAvailable": playSonarAvailable,
	"play.twoTasksLeft": playTwoTasksLeft,
	"result.fail.taskImpossible": resultFailTaskImpossible,
};
