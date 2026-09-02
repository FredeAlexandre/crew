import {
	campaignMembers,
	campaignSteps,
	campaigns,
	type createDb,
	gameHistory,
	gameHistoryEvents,
	playerHistory,
	user,
} from "@crew/db";
import { getLogbook } from "@crew/protocol";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import type { TableState } from "./table.ts";

/** Record a completed attempt for signed-in people seated at this table. */
export async function recordPlayerHistory(db: ReturnType<typeof createDb>, state: TableState) {
	const engine = state.engine;
	if (engine === null || engine.phase !== "result") {
		return;
	}
	const result = engine.result;
	if (result === null) {
		return;
	}
	const facts = (state.historyFacts ?? []).filter((fact) => fact.attemptId === engine.attemptId);
	if (facts.length === 0) {
		return;
	}
	const playerIds = state.seats.flatMap((seat) =>
		seat === null || seat.playerId.startsWith("bot:") ? [] : [seat.playerId],
	);
	if (playerIds.length === 0) {
		return;
	}
	const isCampaign = state.mode === "campaign" && state.campaign !== null;
	const signedIn = await db
		.select({ id: user.id })
		.from(user)
		.where(and(inArray(user.id, playerIds), eq(user.isAnonymous, false)));
	if (signedIn.length === 0 && !isCampaign) {
		return;
	}
	const participants = state.seats.flatMap((seat, seatId) =>
		seat === null
			? []
			: [
					{
						seatId,
						playerId: seat.playerId,
						displayName: seat.displayName,
						isBot: seat.playerId.startsWith("bot:"),
					},
				],
	);
	const campaignId = isCampaign ? (state.campaign?.campaignId ?? null) : null;
	await db
		.insert(gameHistory)
		.values({
			attemptId: engine.attemptId,
			roomCode: state.code,
			campaignId,
			missionId: engine.mission?.id ?? "unknown",
			result,
			failReason: engine.failReason,
			difficulty: engine.mission?.difficulty ?? 0,
			playerCount: state.playerCount,
			participants: JSON.stringify(participants),
			setup: JSON.stringify(state.setup),
			finalState: JSON.stringify(engine),
			...(state.historyStartedAt === undefined
				? {}
				: { startedAt: new Date(state.historyStartedAt) }),
		})
		.onConflictDoNothing();
	await db
		.insert(gameHistoryEvents)
		.values(
			facts.map((fact) => ({
				id: crypto.randomUUID(),
				attemptId: engine.attemptId,
				seq: fact.seq,
				type: fact.type,
				payload: JSON.stringify(fact),
			})),
		)
		.onConflictDoNothing();
	if (signedIn.length > 0) {
		await db
			.insert(playerHistory)
			.values(
				signedIn.map((player) => ({
					id: crypto.randomUUID(),
					userId: player.id,
					missionId: engine.mission?.id ?? "unknown",
					attemptId: engine.attemptId,
					result,
					roomCode: state.code,
					playerCount: state.playerCount,
				})),
			)
			.onConflictDoNothing();
	}
	if (isCampaign) {
		await recordCampaignAttempt(db, state, engine.attemptId, result);
	}
}

export async function insertCampaign(db: ReturnType<typeof createDb>, state: TableState) {
	if (state.mode !== "campaign" || state.campaign === null) {
		return;
	}
	const campaignId = state.campaign.campaignId;
	const now = new Date();
	await db
		.insert(campaigns)
		.values({
			id: campaignId,
			logbookId: state.campaign.logbookId,
			hostPlayerId: state.hostPlayerId,
			roomCode: state.code,
			status: "active",
			stepIndex: 0,
			playerCount: state.playerCount,
			createdAt: now,
			updatedAt: now,
		})
		.onConflictDoNothing();

	const humanMembers = state.seats.flatMap((seat, seatId) => {
		if (seat === null || seat.playerId.startsWith("bot:")) {
			return [];
		}
		return [
			{
				id: crypto.randomUUID(),
				campaignId,
				userId: seat.playerId,
				displayName: seat.displayName,
				seatId,
			},
		];
	});
	if (humanMembers.length > 0) {
		await db.insert(campaignMembers).values(humanMembers).onConflictDoNothing();
	}

	const logbook = getLogbook(state.campaign.logbookId);
	const stepCount = logbook?.steps.length ?? 5;
	const steps = Array.from({ length: stepCount }, (_, i) => ({
		id: crypto.randomUUID(),
		campaignId,
		stepIndex: i,
		attempts: 0,
		status: "current" as const,
		lastAttemptId: null,
	}));
	await db.insert(campaignSteps).values(steps).onConflictDoNothing();
}

async function recordCampaignAttempt(
	db: ReturnType<typeof createDb>,
	state: TableState,
	attemptId: string,
	result: "won" | "failed",
) {
	if (state.mode !== "campaign" || state.campaign === null) {
		return;
	}
	const { campaignId, stepIndex, stepAttempts } = state.campaign;
	const attempts = (stepAttempts[stepIndex] ?? 0) + 1;
	const logbook = getLogbook(state.campaign.logbookId);
	const stepCount = logbook?.steps.length ?? 5;
	const isLastStep = stepIndex >= stepCount - 1;

	await db
		.update(campaignSteps)
		.set({
			attempts,
			lastAttemptId: attemptId,
			...(result === "won" ? { status: "won" } : {}),
		})
		.where(and(eq(campaignSteps.campaignId, campaignId), eq(campaignSteps.stepIndex, stepIndex)));

	await db
		.update(campaigns)
		.set({
			stepIndex,
			updatedAt: new Date(),
			...(result === "won" && isLastStep ? { status: "completed" } : {}),
		})
		.where(eq(campaigns.id, campaignId));
}

export async function listPlayerCampaigns(db: ReturnType<typeof createDb>, userId: string) {
	const memberRows = await db
		.select({
			campaignId: campaignMembers.campaignId,
		})
		.from(campaignMembers)
		.where(eq(campaignMembers.userId, userId));
	if (memberRows.length === 0) {
		return [];
	}
	const campaignIds = [...new Set(memberRows.map((r) => r.campaignId))];
	const rows = await db
		.select()
		.from(campaigns)
		.where(inArray(campaigns.id, campaignIds))
		.orderBy(desc(campaigns.updatedAt));

	const allMembers = await db
		.select()
		.from(campaignMembers)
		.where(inArray(campaignMembers.campaignId, campaignIds));

	const allSteps = await db
		.select()
		.from(campaignSteps)
		.where(inArray(campaignSteps.campaignId, campaignIds));

	return rows.map((camp) => {
		const logbook = getLogbook(camp.logbookId);
		const stepCount = logbook?.steps.length ?? 5;
		const crew = allMembers
			.filter((m) => m.campaignId === camp.id)
			.sort((a, b) => a.seatId - b.seatId)
			.map((m) => m.displayName);
		const steps = allSteps.filter((s) => s.campaignId === camp.id);
		const attemptTotals = steps.reduce((sum, s) => sum + s.attempts, 0);

		return {
			id: camp.id,
			logbookId: camp.logbookId,
			status: camp.status,
			stepIndex: camp.stepIndex,
			stepCount,
			playerCount: camp.playerCount,
			crew,
			attemptTotals,
			lastPlayed: camp.updatedAt.toISOString(),
			roomCode: camp.roomCode,
		};
	});
}

export async function readPlayerCampaign(
	db: ReturnType<typeof createDb>,
	userId: string,
	campaignId: string,
) {
	const member = await db
		.select()
		.from(campaignMembers)
		.where(and(eq(campaignMembers.campaignId, campaignId), eq(campaignMembers.userId, userId)))
		.limit(1);
	if (member.length === 0) {
		return null;
	}
	const campRows = await db.select().from(campaigns).where(eq(campaigns.id, campaignId)).limit(1);
	const camp = campRows[0];
	if (camp === undefined) {
		return null;
	}
	const members = await db
		.select()
		.from(campaignMembers)
		.where(eq(campaignMembers.campaignId, campaignId))
		.orderBy(asc(campaignMembers.seatId));
	const steps = await db
		.select()
		.from(campaignSteps)
		.where(eq(campaignSteps.campaignId, campaignId))
		.orderBy(asc(campaignSteps.stepIndex));
	const attemptRows = await db
		.select({
			attemptId: gameHistory.attemptId,
			missionId: gameHistory.missionId,
		})
		.from(gameHistory)
		.where(eq(gameHistory.campaignId, campaignId));

	const logbook = getLogbook(camp.logbookId);
	const stepCount = logbook?.steps.length ?? 5;

	return {
		id: camp.id,
		logbookId: camp.logbookId,
		status: camp.status,
		stepIndex: camp.stepIndex,
		stepCount,
		playerCount: camp.playerCount,
		roomCode: camp.roomCode,
		crew: members.map((m) => m.displayName),
		steps: steps.map((s) => {
			const stepDef = logbook?.steps[s.stepIndex];
			const stepAttempts = attemptRows.filter((a) => a.missionId === stepDef?.id);
			return {
				stepIndex: s.stepIndex,
				attempts: s.attempts,
				status: s.status,
				lastAttemptId: s.lastAttemptId,
				attemptIds: stepAttempts.map((a) => a.attemptId),
			};
		}),
	};
}

export async function readPlayerHistory(db: ReturnType<typeof createDb>, userId: string) {
	return db
		.select({
			missionId: playerHistory.missionId,
			attemptId: playerHistory.attemptId,
			result: playerHistory.result,
			roomCode: playerHistory.roomCode,
			playerCount: playerHistory.playerCount,
			completedAt: playerHistory.completedAt,
		})
		.from(playerHistory)
		.where(eq(playerHistory.userId, userId))
		.orderBy(desc(playerHistory.completedAt));
}

export async function readPlayerGame(
	db: ReturnType<typeof createDb>,
	userId: string,
	attemptId: string,
) {
	const owned = await db
		.select({ game: gameHistory })
		.from(gameHistory)
		.innerJoin(playerHistory, eq(playerHistory.attemptId, gameHistory.attemptId))
		.where(and(eq(playerHistory.userId, userId), eq(gameHistory.attemptId, attemptId)))
		.limit(1);
	const game = owned[0]?.game;
	if (game === undefined) {
		return null;
	}
	const events = await db
		.select({
			seq: gameHistoryEvents.seq,
			type: gameHistoryEvents.type,
			payload: gameHistoryEvents.payload,
		})
		.from(gameHistoryEvents)
		.where(eq(gameHistoryEvents.attemptId, attemptId))
		.orderBy(gameHistoryEvents.seq);
	return {
		...game,
		participants: JSON.parse(game.participants) as unknown,
		setup: JSON.parse(game.setup) as unknown,
		finalState: JSON.parse(game.finalState) as unknown,
		events: events.map((event) => ({
			...event,
			payload: JSON.parse(event.payload) as unknown,
		})),
	};
}
