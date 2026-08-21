import { CARD_IDS, type CardId } from "@crew/protocol";
import { describe, expect, it } from "vitest";
import {
	dealMid,
	distressOffer,
	fixtures,
	lobbyThreeEmpty,
	playMidTrickFourPlayers,
	playSonarAvailable,
	playTwoTasksLeft,
	resultFailTaskImpossible,
	taskDraftCaptainChoosing,
} from "./fixtures.ts";
import { project } from "./project.ts";
import { tableViewSchema } from "./table.ts";
import {
	failWithImpossibleTask,
	playFirstLegal,
	skipDistressToPlay,
	startAttempt,
	takeAllTasks,
	viewerCaptain,
} from "./test-support.ts";

const allCardIds = new Set<string>(CARD_IDS);

describe("fixtures", () => {
	it("parses every named scene snapshot", () => {
		expect(Object.keys(fixtures).sort()).toEqual(
			[
				"deal.mid",
				"distress.offer",
				"lobby.threeEmpty",
				"play.midTrick.fourPlayers",
				"play.sonarAvailable",
				"play.twoTasksLeft",
				"result.fail.taskImpossible",
				"taskDraft.captainChoosing",
			].sort(),
		);
		for (const view of Object.values(fixtures)) {
			expect(tableViewSchema.parse(view)).toEqual(view);
		}
		expect(lobbyThreeEmpty.scene).toBe("lobby");
		expect(dealMid.scene).toBe("deal");
		expect(dealMid.hand).toHaveLength(4);
	});

	it("matches project() for engine-backed snapshots", () => {
		const drafting = startAttempt(4, 1);
		expect(project(drafting, viewerCaptain(drafting))).toEqual(taskDraftCaptainChoosing);

		expect(project(takeAllTasks(startAttempt(4, 5, 3)), 0)).toEqual(distressOffer);

		const midTrick = playFirstLegal(skipDistressToPlay(startAttempt(4, 11)));
		expect(project(midTrick, midTrick.currentSeat ?? 0)).toEqual(playMidTrickFourPlayers);

		const sonarPlay = skipDistressToPlay(startAttempt(4, 6));
		expect(project(sonarPlay, sonarPlay.currentSeat ?? 0)).toEqual(playSonarAvailable);

		const twoTasks = skipDistressToPlay(startAttempt(4, 5, 3));
		expect(project(twoTasks, viewerCaptain(twoTasks))).toEqual(playTwoTasksLeft);
		expect(twoTasks.tasks.filter((task) => task.status === "open")).toHaveLength(2);

		expect(project(failWithImpossibleTask(startAttempt(4, 11)), 0)).toEqual(
			resultFailTaskImpossible,
		);
	});

	it("does not leak a second viewer's private cards", () => {
		const midTrick = playFirstLegal(skipDistressToPlay(startAttempt(4, 11)));
		const first = midTrick.currentSeat ?? 0;
		const second = ((first + 1) % midTrick.playerCount) as 0 | 1 | 2 | 3;
		const view = project(midTrick, second);
		expect(view).not.toEqual(playMidTrickFourPlayers);
		const dumped = JSON.stringify(view);
		const publicCards = new Set<CardId>([
			...(midTrick.hands[second] ?? []),
			...midTrick.currentTrick.map((play) => play.cardId),
			...(midTrick.lastTrick?.cards.map((play) => play.cardId) ?? []),
			...midTrick.sonar.flatMap((slot) =>
				slot.communication === null ? [] : [slot.communication.cardId],
			),
		]);
		for (const cardId of allCardIds) {
			if (dumped.includes(cardId) && !publicCards.has(cardId as CardId)) {
				const mentionedInTasks = midTrick.tasks.some((task) =>
					JSON.stringify(task.spec).includes(cardId),
				);
				expect(mentionedInTasks).toBe(true);
			}
		}
	});
});
