import { apply, createAttempt, legalIntents } from "@crew/engine";
import { CARD_IDS, type CardId, type TaskPublic } from "@crew/protocol";
import { describe, expect, it } from "vitest";
import { lobbyThreeEmpty } from "./fixtures.ts";
import { project, projectFacts, projectLobby } from "./project.ts";
import { tableViewSchema } from "./table.ts";
import {
	failWithImpossibleTask,
	must,
	playCards,
	playFirstLegal,
	skipDistressToPlay,
	startAttempt,
	takeAllTasks,
	viewerCaptain,
} from "./test-support.ts";

const allCardIds = new Set<string>(CARD_IDS);

function cardIdsInText(text: string): CardId[] {
	return [...allCardIds].filter((id) => text.includes(id)) as CardId[];
}

describe("project", () => {
	it("rotates seats so the viewer is always seat.self", () => {
		const state = startAttempt(4, 1);
		const view = project(state, 2);
		expect(view.seats.map((seat) => seat.region)).toEqual([
			"seat.self",
			"seat.1",
			"seat.2",
			"seat.3",
		]);
		expect(view.seats.map((seat) => seat.seatId)).toEqual([2, 3, 0, 1]);
		expect(view.viewerSeat).toBe(2);
		expect(view.scene).toBe("taskDraft");
		expect(tableViewSchema.parse(view)).toEqual(view);
	});

	it("hides other hands and never marks opponent cards legal", () => {
		const state = startAttempt(4, 1);
		const viewerSeat = 2;
		const view = project(state, viewerSeat);
		const dumped = JSON.stringify(view);
		const viewerHand = new Set(state.hands[viewerSeat]);
		const publicCards = new Set<CardId>([
			...(state.hands[viewerSeat] ?? []),
			...state.currentTrick.map((play) => play.cardId),
			...(state.lastTrick?.cards.map((play) => play.cardId) ?? []),
			...state.sonar.flatMap((slot) =>
				slot.communication === null ? [] : [slot.communication.cardId],
			),
			...state.tasks.flatMap((task) => cardsInTask(task.spec)),
		]);

		for (const cardId of cardIdsInText(dumped)) {
			expect(publicCards.has(cardId)).toBe(true);
		}
		for (let seat = 0; seat < state.playerCount; seat += 1) {
			if (seat === viewerSeat) {
				continue;
			}
			for (const cardId of state.hands[seat] ?? []) {
				if (!publicCards.has(cardId)) {
					expect(dumped.includes(cardId)).toBe(false);
				}
			}
		}

		expect(view.hand.map((card) => card.cardId)).toEqual(state.hands[viewerSeat]);
		expect(view.seats[0]?.handCount).toBe(viewerHand.size);
		expect(view.hand.every((card) => !card.legal)).toBe(true);
		expect(view.affordances.canTakeTask).toBe(state.currentSeat === viewerSeat);
	});

	it("marks follow-suit legality only on the viewer's hand", () => {
		const playing = skipDistressToPlay(startAttempt(4, 11));
		const leader = playing.currentSeat;
		if (leader === null) {
			throw new Error("expected leader");
		}
		const lead =
			playing.hands[leader]?.find((id) => !id.startsWith("submarine-")) ??
			playing.hands[leader]?.[0];
		if (lead === undefined) {
			throw new Error("empty hand");
		}
		const afterLead = must(
			apply(playing, { type: "card.play", attemptId: "a1", seatId: leader, cardId: lead }),
		);
		const follower = afterLead.currentSeat;
		if (follower === null) {
			throw new Error("expected follower");
		}
		const view = project(afterLead, follower);
		const legalIds = new Set(
			legalIntents(afterLead, follower)
				.filter((intent) => intent.type === "card.play")
				.map((intent) => intent.cardId),
		);
		expect(view.scene).toBe("play");
		expect(view.overlay).toBe("none");
		expect(view.trick.cards).toHaveLength(1);
		expect(view.trick.cards[0]?.cardId).toBe(lead);
		expect(view.affordances.canPlay).toBe(true);
		expect(view.hand.filter((card) => card.legal).map((card) => card.cardId)).toEqual([
			...legalIds,
		]);
		const offSuit = view.hand.find((card) => !card.legal);
		if (offSuit !== undefined) {
			expect(offSuit.illegalReason).toBe("mustFollowSuit");
		}
		const leaderView = project(afterLead, leader);
		expect(leaderView.affordances.canPlay).toBe(false);
		expect(leaderView.hand.every((card) => card.illegalReason === "notYourTurn")).toBe(true);
	});

	it("exposes distress overlay and passable color cards", () => {
		const offered = takeAllTasks(startAttempt(4, 5, 3));
		const offerView = project(offered, 0);
		expect(offerView.scene).toBe("play");
		expect(offerView.overlay).toBe("distress");
		expect(offerView.affordances.canSkipDistress).toBe(true);
		expect(offerView.affordances.canActivateDistress).toBe(true);
		expect(offerView.centerTasks).toHaveLength(0);

		const passing = must(
			apply(offered, {
				type: "distress.activate",
				attemptId: "a1",
				seatId: 0,
				direction: "left",
			}),
		);
		const passView = project(passing, 0);
		expect(passView.overlay).toBe("distress");
		expect(passView.chrome.distress).toEqual({ active: true, direction: "left" });
		expect(passView.affordances.canPassDistressCard).toBe(true);
		expect(passView.hand.some((card) => card.legal)).toBe(true);
		const sub = passView.hand.find((card) => card.cardId.startsWith("submarine-"));
		if (sub !== undefined) {
			expect(sub.legal).toBe(false);
			expect(sub.illegalReason).toBe("cannotPassSubmarine");
		}
	});

	it("lists sonar candidates and duplicates the communicated card in hand", () => {
		const playing = skipDistressToPlay(startAttempt(4, 6));
		const seat = playing.currentSeat ?? 0;
		const uses = legalIntents(playing, seat).filter((intent) => intent.type === "sonar.use");
		expect(uses.length).toBeGreaterThan(0);
		const use = uses[0];
		if (use === undefined || use.type !== "sonar.use") {
			throw new Error("expected sonar");
		}
		const before = project(playing, seat);
		expect(before.affordances.canSonar).toBe(true);
		expect(before.sonarCandidates).toContainEqual({ cardId: use.cardId, position: use.position });
		expect(before.seats[0]?.sonar.state).toBe("available");

		const after = must(apply(playing, use));
		const view = project(after, seat);
		expect(view.affordances.canSonar).toBe(false);
		expect(view.seats[0]?.sonar).toEqual({
			state: "communicating",
			communication: { cardId: use.cardId, position: use.position },
		});
		expect(view.hand.find((card) => card.cardId === use.cardId)?.communicated).toBe(true);
	});

	it("lists sonar candidates during a trick even though canSonar is false", () => {
		const playing = skipDistressToPlay(startAttempt(4, 11));
		const mid = playFirstLegal(playing);
		const viewer = mid.currentSeat ?? 0;
		const view = project(mid, viewer);
		expect(view.affordances.canSonar).toBe(false);
		expect(view.chrome.sonarAvailable).toBe(true);
		expect(view.sonarCandidates.length).toBeGreaterThan(0);
	});

	it("keeps last-trick contents public and peeks for every viewer", () => {
		const playing = skipDistressToPlay(startAttempt(4, 11));
		const afterTrick = playCards(playing, 4);
		expect(afterTrick.lastTrick).not.toBeNull();
		const view = project(afterTrick, 2);
		expect(view.lastTrick?.cards).toHaveLength(4);
		expect(view.history).toHaveLength(afterTrick.phase === "result" ? 1 : 0);
		expect(view.affordances.canPeekLastTrick).toBe(true);
		expect(view.seats.filter((seat) => seat.isLastTrickWinner)).toHaveLength(1);
		expect(view.undealt.present).toBe(false);
	});

	it("marks the leftover-card slot for three players", () => {
		const view = project(startAttempt(3, 42), 0);
		expect(view.playerCount).toBe(3);
		expect(view.undealt.present).toBe(true);
		expect(view.seats).toHaveLength(3);
	});

	it("projects mission failure after an impossible task", () => {
		const ended = failWithImpossibleTask(startAttempt(4, 11));
		expect(ended.phase).toBe("result");
		expect(ended.result).toBe("failed");
		const view = project(ended, 0);
		expect(view.scene).toBe("result");
		expect(view.result).toEqual({ outcome: "failed", reason: ended.failReason });
		expect(view.history).toHaveLength(ended.trickHistory.length);
		expect(view.history.at(-1)?.cards).toHaveLength(ended.playerCount);
		expect(view.affordances.canPlay).toBe(false);
		expect(view.affordances.canRetry).toBe(false);
		expect(project(ended, 0, undefined, 0).affordances.canRetry).toBe(true);
		expect(project(ended, 1, undefined, 0).affordances.canRetry).toBe(false);
	});

	it("does not leak other hands from a mid-trick dump", () => {
		const playing = skipDistressToPlay(startAttempt(4, 11));
		const mid = playFirstLegal(playing);
		const viewer = mid.currentSeat ?? 0;
		const view = project(mid, viewer);
		const dumped = JSON.stringify(view);
		const publicCards = new Set<CardId>([
			...(mid.hands[viewer] ?? []),
			...mid.currentTrick.map((play) => play.cardId),
			...(mid.lastTrick?.cards.map((play) => play.cardId) ?? []),
			...mid.sonar.flatMap((slot) =>
				slot.communication === null ? [] : [slot.communication.cardId],
			),
			...mid.tasks.flatMap((task) => cardsInTask(task.spec)),
		]);
		for (const cardId of cardIdsInText(dumped)) {
			expect(publicCards.has(cardId)).toBe(true);
		}
	});
});

describe("projectFacts", () => {
	it("strips dealt card ids except the viewer's", () => {
		const { facts } = createAttempt({
			attemptId: "a1",
			mission: { id: "m1", difficulty: 1 },
			playerCount: 4,
			seed: 1,
		});
		const viewerSeat = 1;
		const projected = projectFacts(facts, viewerSeat);
		const dealt = projected.filter((fact) => fact.type === "card.dealt");
		expect(dealt.length).toBe(40);
		for (const fact of dealt) {
			if (fact.seatId === viewerSeat) {
				expect(fact.cardId).toBeDefined();
			} else {
				expect(fact.cardId).toBeUndefined();
			}
		}
	});

	it("strips passed card ids unless the viewer sent or received", () => {
		const offered = takeAllTasks(startAttempt(4, 9));
		const activated = must(
			apply(offered, {
				type: "distress.activate",
				attemptId: "a1",
				seatId: 0,
				direction: "right",
			}),
		);
		let current = activated;
		const facts = [];
		for (let seat = 0; seat < 4; seat += 1) {
			const color = current.hands[seat]?.find((id) => !id.startsWith("submarine-"));
			if (color === undefined) {
				throw new Error("no color card");
			}
			const result = apply(current, {
				type: "distress.passCard",
				attemptId: "a1",
				seatId: seat,
				cardId: color,
			});
			if (!result.ok) {
				throw new Error(result.error);
			}
			current = result.state;
			facts.push(...result.facts);
		}
		const passed = facts.filter((fact) => fact.type === "card.passed");
		expect(passed.length).toBe(4);
		const forSeat1 = projectFacts(passed, 1).filter((fact) => fact.type === "card.passed");
		const visible = forSeat1.filter((fact) => fact.cardId !== undefined);
		const hidden = forSeat1.filter((fact) => fact.cardId === undefined);
		expect(visible.length).toBe(2);
		expect(hidden.length).toBe(2);
		expect(visible.every((fact) => fact.fromSeat === 1 || fact.toSeat === 1)).toBe(true);
	});
});

describe("captain region", () => {
	it("puts the captain token on the rotated seat", () => {
		const state = startAttempt(4, 2);
		const captain = viewerCaptain(state);
		const view = project(state, captain);
		expect(view.seats[0]?.isCaptain).toBe(true);
		const other = project(state, ((captain + 1) % 4) as 0 | 1 | 2 | 3);
		expect(other.seats[0]?.isCaptain).toBe(false);
		expect(other.seats.find((seat) => seat.seatId === captain)?.isCaptain).toBe(true);
	});
});

describe("occupancy", () => {
	it("projects lobby holes like the three-empty fixture", () => {
		const view = projectLobby([null, null, null], 0, 0, 0);
		expect(view.affordances.canStart).toBe(false);
		expect(view).toEqual(lobbyThreeEmpty);
		expect(tableViewSchema.parse(view)).toEqual(view);
	});

	it("lets only the host start when every seat is filled and ready", () => {
		const occupancy = [
			{ playerId: "p0", displayName: "Alex", connected: true, ready: true },
			{ playerId: "p1", displayName: "Bea", connected: true, ready: true },
			{ playerId: "p2", displayName: "Cam", connected: true, ready: true },
		] as const;
		const host = projectLobby(occupancy, 0, 5, 0);
		expect(host.affordances.canStart).toBe(true);
		expect(projectLobby(occupancy, 1, 5, 0).affordances.canStart).toBe(false);
		const waiting = [
			occupancy[0],
			occupancy[1],
			{ playerId: "p2", displayName: "Cam", connected: true, ready: false },
		] as const;
		expect(projectLobby(waiting, 0, 5, 0).affordances.canStart).toBe(false);
		expect(projectLobby([occupancy[0], occupancy[1], null], 0, 5, 0).affordances.canStart).toBe(
			false,
		);
	});

	it("lets only the seated host fill empty chairs", () => {
		const hostOnly = [
			{ playerId: "p0", displayName: "Alex", connected: true, ready: false },
			null,
			null,
		] as const;
		expect(projectLobby(hostOnly, 0, 1, 0).affordances.canFillBots).toBe(true);
		expect(projectLobby(hostOnly, 1, 1, 0).affordances.canFillBots).toBe(false);
		expect(projectLobby([null, null, null], 0, 0, 0).affordances.canFillBots).toBe(false);
		const full = [
			{ playerId: "p0", displayName: "Alex", connected: true, ready: true },
			{ playerId: "p1", displayName: "Bea", connected: true, ready: true },
			{ playerId: "p2", displayName: "Cam", connected: true, ready: true },
		] as const;
		expect(projectLobby(full, 0, 5, 0).affordances.canFillBots).toBe(false);
	});

	it("lets only the seated host configure difficulty and captain", () => {
		const hostOnly = [
			{ playerId: "p0", displayName: "Alex", connected: true, ready: false },
			null,
			null,
		] as const;
		const host = projectLobby(hostOnly, 0, 1, 0, {
			difficulty: 6,
			captainSeat: 0,
			distressDisabled: true,
		});
		expect(host.affordances.canConfigure).toBe(true);
		expect(host.chrome.difficulty).toBe(6);
		expect(host.chrome.flags.distressDisabled).toBe(true);
		expect(host.seats.find((seat) => seat.seatId === 0)?.isCaptain).toBe(true);
		expect(host.seats.find((seat) => seat.seatId === 1)?.isCaptain).toBe(false);
		expect(projectLobby(hostOnly, 1, 1, 0).affordances.canConfigure).toBe(false);
		expect(projectLobby([null, null, null], 0, 0, 0).affordances.canConfigure).toBe(false);
		expect(projectLobby(hostOnly, 0, 1, 0).chrome.difficulty).toBe(4);
		expect(projectLobby(hostOnly, 0, 1, 0).chrome.flags.distressDisabled).toBe(false);
	});

	it("keeps occupancy names after a deal", () => {
		const occupancy = [
			{ playerId: "p0", displayName: "Alex", connected: true, ready: true },
			{ playerId: "p1", displayName: "Bea", connected: true, ready: true },
			null,
		];
		const lobby = projectLobby(occupancy, 0, 3, 0);
		expect(lobby.seats[0]?.displayName).toBe("Alex");
		expect(lobby.seats[1]?.displayName).toBe("Bea");
		expect(lobby.seats[2]?.displayName).toBeNull();
		expect(lobby.seats[2]?.connected).toBe(false);
		expect(lobby.affordances.canStart).toBe(false);

		const state = startAttempt(3, 1);
		const view = project(state, 0, occupancy);
		expect(view.scene).toBe("taskDraft");
		expect(view.affordances.canStart).toBe(false);
		expect(view.seats.find((seat) => seat.seatId === 0)?.displayName).toBe("Alex");
		expect(view.seats.find((seat) => seat.seatId === 1)?.displayName).toBe("Bea");
		expect(view.seats.find((seat) => seat.seatId === 2)?.displayName).toBeNull();
		expect(view.hand.map((card) => card.cardId)).toEqual(state.hands[0]);
	});
});

function cardsInTask(spec: TaskPublic): CardId[] {
	if (spec.kind === "winCards") {
		return [...spec.cards];
	}
	if (spec.kind === "winWith" && spec.card !== undefined) {
		return [spec.card];
	}
	if (spec.kind === "avoid" && spec.cards !== undefined) {
		return [...spec.cards];
	}
	return [];
}
