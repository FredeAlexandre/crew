import type { IllegalReason } from "@crew/protocol";
import type { SeatView, TableView } from "@crew/view-model/fixtures";

const OPPONENT_NAMES: Record<string, string> = {
	"seat.1": "Alex",
	"seat.2": "Sam",
	"seat.3": "Jo",
	"seat.4": "Kim",
};

const ILLEGAL_COPY: Record<IllegalReason, string> = {
	notYourTurn: "Not your turn",
	wrongPhase: "Not now",
	wrongAttempt: "Stale table",
	mustFollowSuit: "Must follow suit",
	cardNotInHand: "Not in hand",
	sonarAlreadyUsed: "Sonar already used",
	sonarDisabled: "Sonar is off",
	sonarSubmarine: "Cannot communicate a submarine",
	sonarNotExtreme: "Not your highest, lowest, or only of that color",
	sonarDuringTrick: "Not during a trick",
	cannotPassTask: "Cannot pass",
	cannotTakeTask: "Cannot take this task",
	captainMayNotSelect: "Captain may not take this",
	taskNotAvailable: "That task is gone",
	cannotPassSubmarine: "Cannot pass a submarine",
	alreadyPassedCard: "Already passed",
	unknownIntent: "Cannot do that",
	missionOver: "Mission is over",
	illegalSeat: "Wrong seat",
};

export function seatName(seat: SeatView): string {
	if (seat.displayName) {
		return seat.displayName;
	}
	if (seat.region === "seat.self") {
		return "You";
	}
	if (!seat.connected) {
		return "Empty";
	}
	return OPPONENT_NAMES[seat.region] ?? "Crew";
}

export function seatIsEmpty(seat: SeatView): boolean {
	return seat.displayName === null && !seat.connected;
}

export function missionHeading(missionId: string | null): string {
	if (missionId === null) {
		return "Mission";
	}
	return `Mission ${missionId.replace(/^m/i, "")}`;
}

export function turnCopy(view: TableView): string | null {
	const region = view.chrome.turnRegion;
	if (region === null) {
		return null;
	}
	if (region === "seat.self") {
		return "Your turn";
	}
	const seat = view.seats.find((entry) => entry.region === region);
	return seat ? `${seatName(seat)}'s turn` : "Turn";
}

export function illegalCopy(reason: IllegalReason | null): string | null {
	if (reason === null) {
		return null;
	}
	return ILLEGAL_COPY[reason];
}

export function resultCopy(reason: string | null): string | null {
	if (reason === "taskImpossible") {
		return "A task became impossible.";
	}
	return reason;
}

export function selfSeat(view: TableView): SeatView | undefined {
	return view.seats.find((seat) => seat.region === "seat.self");
}

export type LobbySlot = "self" | "west" | "east" | "north" | "northwest" | "northeast";

export function lobbySlot(region: SeatView["region"], playerCount: number): LobbySlot {
	if (region === "seat.self") {
		return "self";
	}
	if (playerCount <= 3) {
		return region === "seat.1" ? "west" : "east";
	}
	if (playerCount === 4) {
		if (region === "seat.1") {
			return "west";
		}
		if (region === "seat.2") {
			return "north";
		}
		return "east";
	}
	if (region === "seat.1") {
		return "west";
	}
	if (region === "seat.2") {
		return "northwest";
	}
	if (region === "seat.3") {
		return "northeast";
	}
	return "east";
}

export function sonarPositionCopy(position: "highest" | "only" | "lowest"): string {
	if (position === "highest") {
		return "Highest of this color";
	}
	if (position === "only") {
		return "Only card of this color";
	}
	return "Lowest of this color";
}

export function trickSlot(
	region: SeatView["region"],
	playerCount: number,
): "top" | "left" | "right" | "bottom" {
	if (region === "seat.self") {
		return "bottom";
	}
	if (playerCount <= 3) {
		return region === "seat.1" ? "left" : "right";
	}
	if (playerCount === 4) {
		if (region === "seat.1") {
			return "left";
		}
		if (region === "seat.2") {
			return "top";
		}
		return "right";
	}
	if (region === "seat.1") {
		return "left";
	}
	if (region === "seat.4") {
		return "right";
	}
	return "top";
}
