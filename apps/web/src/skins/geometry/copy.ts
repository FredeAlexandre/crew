import type { IllegalReason } from "@crew/protocol";
import type { SeatView, TableView } from "@crew/view-model/fixtures";
import type { Translate } from "../../lib/i18n.tsx";

const OPPONENT_NAMES: Record<string, string> = {
	"seat.1": "Alex",
	"seat.2": "Sam",
	"seat.3": "Jo",
	"seat.4": "Kim",
};

export function seatName(seat: SeatView, t: Translate): string {
	if (seat.displayName) {
		return seat.displayName;
	}
	if (seat.region === "seat.self") {
		return t("you");
	}
	if (!seat.connected) {
		return t("empty");
	}
	return OPPONENT_NAMES[seat.region] ?? t("crew");
}

export function seatIdenticonSeed(seat: SeatView): string {
	return seat.avatarSeed ?? seat.displayName ?? seat.region;
}

export function seatIsEmpty(seat: SeatView): boolean {
	return seat.displayName === null && !seat.connected;
}

export function seatIsBot(seat: SeatView): boolean {
	return seat.avatarSeed?.startsWith("bot:") === true;
}

export function missionHeading(missionId: string | null, t: Translate): string {
	if (missionId === null) {
		return t("missionPlain");
	}
	return t("mission", { number: missionId.replace(/^m/i, "") });
}

export function turnCopy(view: TableView, t: Translate): string | null {
	const region = view.chrome.turnRegion;
	if (region === null) {
		return null;
	}
	if (region === "seat.self") {
		return t("yourTurn");
	}
	const seat = view.seats.find((entry) => entry.region === region);
	return seat ? t("turnOf", { name: seatName(seat, t) }) : t("turnLabel");
}

export function illegalCopy(reason: IllegalReason | null, t: Translate): string | null {
	if (reason === null) {
		return null;
	}
	return t(reason);
}

export function resultCopy(reason: string | null, t: Translate): string | null {
	if (reason === "taskImpossible") {
		return t("failTaskImpossible");
	}
	if (reason === "cardsExhausted") {
		return t("failCardsExhausted");
	}
	return reason;
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

export function sonarPositionCopy(position: "highest" | "only" | "lowest", t: Translate): string {
	if (position === "highest") {
		return t("sonarHighestOfColor");
	}
	if (position === "only") {
		return t("sonarOnlyOfColor");
	}
	return t("sonarLowestOfColor");
}

export function playLeadRegion(
	view: {
		scene?: string;
		trick: { leadRegion: SeatView["region"] | null };
		chrome: { turnRegion: SeatView["region"] | null };
		seats: ReadonlyArray<{ region: SeatView["region"]; isCaptain: boolean }>;
	},
	shownLead: SeatView["region"] | null | undefined = undefined,
): SeatView["region"] | null {
	if (shownLead) {
		return shownLead;
	}
	if (view.trick.leadRegion) {
		return view.trick.leadRegion;
	}
	if (view.scene !== "taskDraft" && view.scene !== "deal" && view.chrome.turnRegion) {
		return view.chrome.turnRegion;
	}
	return view.seats.find((seat) => seat.isCaptain)?.region ?? view.chrome.turnRegion ?? null;
}

export function seatsInPlayOrder<T extends { region: SeatView["region"] }>(
	seats: readonly T[],
	leadRegion: SeatView["region"] | null,
): T[] {
	if (seats.length === 0) {
		return [];
	}
	const leadIndex =
		leadRegion === null ? -1 : seats.findIndex((seat) => seat.region === leadRegion);
	const start = leadIndex >= 0 ? leadIndex : 0;
	return [...seats.slice(start), ...seats.slice(0, start)];
}
