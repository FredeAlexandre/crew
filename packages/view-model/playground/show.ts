import type { HandCard, SeatView, TableView, TaskView, TrickCard } from "../src/table.ts";

/** These scripts live inside `@crew/view-model`, so they import `../src`. Consumers use `@crew/view-model` and `@crew/view-model/project`. */

export function heading(text: string): void {
	console.log(`\n── ${text}`);
}

export function note(text: string): void {
	console.log(`   ${text}`);
}

export function showView(view: TableView): void {
	const result =
		view.result === null
			? "-"
			: `${view.result.outcome}${view.result.reason !== null ? ` (${view.result.reason})` : ""}`;
	note(
		`attempt ${view.attemptId ?? "-"}  seq ${view.seq}  scene ${view.scene}  overlay ${view.overlay}  result ${result}`,
	);
	note(`viewer engine-seat ${view.viewerSeat}   players ${view.playerCount}`);
	const turn = view.chrome.turnRegion ?? "-";
	const trick = view.chrome.trickId === null ? "-" : String(view.chrome.trickId);
	note(
		`mission ${view.chrome.missionId ?? "-"}  trick ${trick}  turn ${turn}  sonarAvailable ${view.chrome.sonarAvailable}`,
	);
	if (view.chrome.distress.active || view.chrome.distress.direction !== null) {
		note(
			`distress active=${view.chrome.distress.active}  direction=${view.chrome.distress.direction ?? "-"}`,
		);
	}
	if (view.undealt.present) {
		note("undealt slot present (3 players)");
	}

	heading("seats (rotated — self is always first)");
	for (const seat of view.seats) {
		note(formatSeat(seat));
	}

	heading("hand (viewer only)");
	if (view.hand.length === 0) {
		note("(empty)");
	} else {
		for (const card of view.hand) {
			note(formatCard(card));
		}
	}

	if (view.trick.cards.length > 0) {
		heading("trick");
		note(
			`trick ${view.trick.trickId ?? "-"}  led ${view.trick.ledSuit ?? "-"}  lead ${view.trick.leadRegion ?? "-"}`,
		);
		for (const card of view.trick.cards) {
			note(formatTrickCard(card));
		}
	}

	if (view.centerTasks.length > 0) {
		heading("tasks.center");
		for (const task of view.centerTasks) {
			note(formatTask(task));
		}
	}

	if (view.sonarCandidates.length > 0) {
		heading("sonar candidates");
		for (const candidate of view.sonarCandidates) {
			note(`${candidate.cardId}  ${candidate.position}`);
		}
	}

	if (view.lastTrick !== null) {
		heading("last trick");
		note(
			`trick ${view.lastTrick.trickId}  winner ${view.lastTrick.winnerRegion}  led ${view.lastTrick.ledSuit}`,
		);
		for (const card of view.lastTrick.cards) {
			note(formatTrickCard(card));
		}
	}

	heading("affordances");
	showAffordances(view);
}

export function showAffordances(view: TableView): void {
	const on = Object.entries(view.affordances)
		.filter(([, allowed]) => allowed)
		.map(([name]) => name);
	if (on.length === 0) {
		note("(none)");
		return;
	}
	note(on.join("  "));
}

function formatSeat(seat: SeatView): string {
	const marks = [
		seat.isCaptain ? "captain" : null,
		seat.isTurn ? "← turn" : null,
		seat.isLastTrickWinner ? "last-trick" : null,
	].filter((mark) => mark !== null);
	const sonar =
		seat.sonar.communication === null
			? `sonar=${seat.sonar.state}`
			: `sonar=${seat.sonar.state} ${seat.sonar.communication.cardId} ${seat.sonar.communication.position}`;
	const extra = marks.length === 0 ? "" : `  ${marks.join("  ")}`;
	return `${seat.region}  engine-seat ${seat.seatId}  ${sonar}  hand ${seat.handCount}  won ${seat.wonTrickCount}${extra}`;
}

function formatCard(card: HandCard): string {
	const marks = [
		card.legal ? "legal" : null,
		card.illegalReason,
		card.communicated ? "communicated" : null,
	].filter((mark) => mark !== null);
	return marks.length === 0 ? card.cardId : `${card.cardId}  ${marks.join("  ")}`;
}

function formatTrickCard(card: TrickCard): string {
	return `#${card.order}  ${card.region}  ${card.cardId}`;
}

function formatTask(task: TaskView): string {
	const take = task.takeable ? "  takeable" : "";
	return `${task.instanceId}  ${task.region}  ${task.status}  ${task.spec.kind}${take}`;
}
