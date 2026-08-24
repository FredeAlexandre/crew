import {
	DEFAULT_MISSION_DIFFICULTY,
	MISSION_DIFFICULTY_MAX,
	MISSION_DIFFICULTY_MIN,
	type SeatId,
} from "@crew/protocol";
import type { SeatView, TableView } from "@crew/view-model/fixtures";
import { Button } from "react-aria-components";
import { type LobbySlot, lobbySlot, seatIsEmpty, seatName } from "./copy.ts";
import styles from "./scenes.module.css";

export type LobbySetup = {
	difficulty: number;
	captainSeat: SeatId | null;
	distressDisabled: boolean;
};

export type LobbyActions = {
	roomCode?: string;
	copied?: boolean;
	statusNote?: string | null;
	alert?: string | null;
	onCopyCode?: () => void;
	onReady?: (ready: boolean) => void;
	onFillBots?: () => void;
	onConfigure?: (setup: LobbySetup) => void;
	onStart?: () => void;
};

export function LobbyScene({ view, actions }: { view: TableView; actions?: LobbyActions }) {
	const code = actions?.roomCode || "————";
	const setup = currentSetup(view);
	return (
		<div className={`${styles.board} ${styles.lobby}`} data-scene={view.scene}>
			<header className={styles.lobbyHead}>
				<p className={styles.kicker}>Crew</p>
				<Button
					className={styles.code}
					onPress={actions?.onCopyCode}
					isDisabled={!actions?.onCopyCode}
					aria-label={`Copy lobby link for ${code}`}
				>
					{code}
				</Button>
				<p className={styles.lede}>Share this link. Empty chairs stay empty until someone sits.</p>
				{actions?.copied ? <p className={styles.lede}>Link copied.</p> : null}
			</header>
			<div className={styles.ring} data-count={String(view.playerCount)}>
				{view.seats.map((seat) => (
					<Chair
						key={seat.region}
						seat={seat}
						slot={lobbySlot(seat.region, view.playerCount)}
						onReady={actions?.onReady}
					/>
				))}
				<div className={styles.lobbyWell}>
					<SetupPanel view={view} setup={setup} onConfigure={actions?.onConfigure} />
					{actions?.onFillBots ? (
						<Button className={styles.ghost} onPress={actions.onFillBots}>
							Fill empty seats
						</Button>
					) : null}
					{actions?.onStart ? (
						<Button className={styles.primary} onPress={actions.onStart}>
							Start
						</Button>
					) : null}
					{actions?.statusNote ? <p className={styles.lede}>{actions.statusNote}</p> : null}
					{actions?.alert ? (
						<p className={styles.alert} role="alert">
							{actions.alert}
						</p>
					) : null}
				</div>
			</div>
		</div>
	);
}

function SetupPanel({
	view,
	setup,
	onConfigure,
}: {
	view: TableView;
	setup: LobbySetup;
	onConfigure?: (setup: LobbySetup) => void;
}) {
	if (onConfigure === undefined) {
		return <p className={styles.lede}>{setupCopy(view, setup)}</p>;
	}

	return (
		<div className={styles.setup}>
			<div className={styles.setupRow}>
				<span className={styles.setupLabel}>Difficulty</span>
				<Button
					className={styles.ghost}
					isDisabled={setup.difficulty <= MISSION_DIFFICULTY_MIN}
					onPress={() => onConfigure({ ...setup, difficulty: setup.difficulty - 1 })}
					aria-label="Lower difficulty"
				>
					–
				</Button>
				<span className={styles.setupValue}>{setup.difficulty}</span>
				<Button
					className={styles.ghost}
					isDisabled={setup.difficulty >= MISSION_DIFFICULTY_MAX}
					onPress={() => onConfigure({ ...setup, difficulty: setup.difficulty + 1 })}
					aria-label="Raise difficulty"
				>
					+
				</Button>
			</div>
			<div className={styles.setupRow}>
				<span className={styles.setupLabel}>Captain</span>
				<div className={styles.setupPicks}>
					<Button
						className={setup.captainSeat === null ? styles.primary : styles.ghost}
						onPress={() => onConfigure({ ...setup, captainSeat: null })}
					>
						Random
					</Button>
					{view.seats.map((seat) => (
						<Button
							key={seat.seatId}
							className={setup.captainSeat === seat.seatId ? styles.primary : styles.ghost}
							onPress={() => onConfigure({ ...setup, captainSeat: seat.seatId })}
						>
							{captainPickLabel(seat)}
						</Button>
					))}
				</div>
			</div>
			<div className={styles.setupRow}>
				<span className={styles.setupLabel}>Distress</span>
				<div className={styles.setupPicks}>
					<Button
						className={setup.distressDisabled ? styles.ghost : styles.primary}
						onPress={() => onConfigure({ ...setup, distressDisabled: false })}
					>
						On
					</Button>
					<Button
						className={setup.distressDisabled ? styles.primary : styles.ghost}
						onPress={() => onConfigure({ ...setup, distressDisabled: true })}
					>
						Off
					</Button>
				</div>
			</div>
		</div>
	);
}

function Chair({
	seat,
	slot,
	onReady,
}: {
	seat: SeatView;
	slot: LobbySlot;
	onReady?: (ready: boolean) => void;
}) {
	const empty = seatIsEmpty(seat);
	const self = slot === "self";
	return (
		<div
			className={styles.chair}
			data-region={seat.region}
			data-slot={slot}
			data-empty={empty ? "true" : "false"}
			data-ready={seat.ready ? "true" : "false"}
			data-captain={seat.isCaptain ? "true" : "false"}
			data-self={self ? "true" : "false"}
		>
			<span
				className={styles.notch}
				data-empty={empty ? "true" : "false"}
				data-self={self ? "true" : "false"}
				data-ready={seat.ready ? "true" : "false"}
				data-captain={seat.isCaptain ? "true" : "false"}
			/>
			<span className={styles.chairName}>{empty ? "Empty" : seatName(seat)}</span>
			{seat.isCaptain ? <span className={styles.readyMark}>Captain</span> : null}
			{self && !empty ? (
				<Button className={styles.ghost} onPress={() => onReady?.(!seat.ready)}>
					{seat.ready ? "Ready" : "Sit ready"}
				</Button>
			) : seat.ready ? (
				<span className={styles.readyMark}>Ready</span>
			) : null}
		</div>
	);
}

function currentSetup(view: TableView): LobbySetup {
	return {
		difficulty: view.chrome.difficulty ?? DEFAULT_MISSION_DIFFICULTY,
		captainSeat: view.seats.find((seat) => seat.isCaptain)?.seatId ?? null,
		distressDisabled: view.chrome.flags.distressDisabled,
	};
}

function setupCopy(view: TableView, setup: LobbySetup): string {
	const captain = view.seats.find((seat) => seat.isCaptain);
	const captainLabel = captain === undefined ? "random" : captainPickLabel(captain);
	const distress = setup.distressDisabled ? "off" : "on";
	return `Difficulty ${setup.difficulty} · Captain ${captainLabel} · Distress ${distress}`;
}

function captainPickLabel(seat: SeatView): string {
	if (seat.region === "seat.self") {
		return "You";
	}
	if (seatIsEmpty(seat)) {
		return `Seat ${seat.seatId + 1}`;
	}
	return seatName(seat);
}
