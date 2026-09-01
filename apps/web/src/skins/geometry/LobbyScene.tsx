import {
	DEFAULT_MISSION_DIFFICULTY,
	MISSION_DIFFICULTY_MAX,
	MISSION_DIFFICULTY_MIN,
	type SeatId,
} from "@crew/protocol";
import type { SeatView, TableView } from "@crew/view-model/fixtures";
import { TextField } from "react-aria-components";
import { Button } from "../../components/ui/button.tsx";
import { Input } from "../../components/ui/input.tsx";
import { Label } from "../../components/ui/label.tsx";
import { DISPLAY_NAME_MAX } from "../../lib/display-name.ts";
import { useI18n } from "../../lib/i18n.tsx";
import { type LobbySlot, lobbySlot, seatIsEmpty, seatName } from "./copy.ts";
import { SeatAvatar } from "./parts.tsx";
import styles from "./scenes.module.css";

export type LobbySetup = {
	difficulty: number;
	captainSeat: SeatId | null;
	distressDisabled: boolean;
	completedTricksVisible: boolean;
};

export type LobbyActions = {
	roomCode?: string;
	copied?: boolean;
	statusNote?: string | null;
	alert?: string | null;
	name?: string;
	onNameChange?: (name: string) => void;
	onCopyCode?: () => void;
	onReady?: (ready: boolean) => void;
	onFillBots?: () => void;
	onKick?: (seatId: SeatId) => void;
	onConfigure?: (setup: LobbySetup) => void;
	onStart?: () => void;
};

export function LobbyScene({ view, actions }: { view: TableView; actions?: LobbyActions }) {
	const { t } = useI18n();
	const code = actions?.roomCode || "————";
	const setup = currentSetup(view);
	return (
		<div className={`${styles.board} ${styles.lobby}`} data-scene={view.scene}>
			<header className={styles.lobbyHead}>
				<p className={styles.kicker}>{t("siteTitle")}</p>
				<Button
					variant="ghost"
					className="font-heading h-auto px-0 text-2xl font-semibold tracking-widest uppercase"
					onPress={actions?.onCopyCode}
					isDisabled={!actions?.onCopyCode}
					aria-label={t("copyLobbyLink", { code })}
				>
					{code}
				</Button>
				<p className={styles.lede}>{t("shareLobby")}</p>
				{actions?.copied ? <p className={styles.lede}>{t("linkCopied")}</p> : null}
			</header>
			<div className={styles.ring} data-count={String(view.playerCount)}>
				{view.seats.map((seat) => (
					<Chair
						key={seat.region}
						seat={seat}
						slot={lobbySlot(seat.region, view.playerCount)}
						onReady={actions?.onReady}
						name={actions?.name}
						onNameChange={actions?.onNameChange}
						onKick={actions?.onKick}
					/>
				))}
				<div className={styles.lobbyWell}>
					<SetupPanel view={view} setup={setup} onConfigure={actions?.onConfigure} />
					{actions?.onFillBots ? (
						<Button variant="ghost" onPress={actions.onFillBots}>
							{t("fillSeats")}
						</Button>
					) : null}
					{actions?.onStart ? <Button onPress={actions.onStart}>{t("start")}</Button> : null}
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
	const { t } = useI18n();
	if (onConfigure === undefined) {
		return <p className={styles.lede}>{setupCopy(view, setup, t)}</p>;
	}

	return (
		<div className={styles.setup}>
			<div className={styles.setupRow}>
				<span className={styles.setupLabel}>{t("difficulty")}</span>
				<Button
					variant="ghost"
					size="icon"
					isDisabled={setup.difficulty <= MISSION_DIFFICULTY_MIN}
					onPress={() => onConfigure({ ...setup, difficulty: setup.difficulty - 1 })}
					aria-label={t("lowerDifficulty")}
				>
					–
				</Button>
				<span className={styles.setupValue}>{setup.difficulty}</span>
				<Button
					variant="ghost"
					size="icon"
					isDisabled={setup.difficulty >= MISSION_DIFFICULTY_MAX}
					onPress={() => onConfigure({ ...setup, difficulty: setup.difficulty + 1 })}
					aria-label={t("raiseDifficulty")}
				>
					+
				</Button>
			</div>
			<div className={styles.setupRow}>
				<span className={styles.setupLabel}>{t("captain")}</span>
				<div className={styles.setupPicks}>
					<Button
						variant={setup.captainSeat === null ? "default" : "ghost"}
						size="sm"
						onPress={() => onConfigure({ ...setup, captainSeat: null })}
					>
						{t("random")}
					</Button>
					{view.seats.map((seat) => (
						<Button
							key={seat.seatId}
							variant={setup.captainSeat === seat.seatId ? "default" : "ghost"}
							size="sm"
							onPress={() => onConfigure({ ...setup, captainSeat: seat.seatId })}
						>
							{captainPickLabel(seat, t)}
						</Button>
					))}
				</div>
			</div>
			<div className={styles.setupRow}>
				<span className={styles.setupLabel}>{t("distress")}</span>
				<div className={styles.setupPicks}>
					<Button
						variant={setup.distressDisabled ? "ghost" : "default"}
						size="sm"
						onPress={() => onConfigure({ ...setup, distressDisabled: false })}
					>
						{t("on")}
					</Button>
					<Button
						variant={setup.distressDisabled ? "default" : "ghost"}
						size="sm"
						onPress={() => onConfigure({ ...setup, distressDisabled: true })}
					>
						{t("off")}
					</Button>
				</div>
			</div>
			<div className={styles.setupRow}>
				<span className={styles.setupLabel}>{t("completedTricks")}</span>
				<div className={styles.setupPicks}>
					<Button
						variant={setup.completedTricksVisible ? "default" : "ghost"}
						size="sm"
						onPress={() => onConfigure({ ...setup, completedTricksVisible: true })}
					>
						{t("on")}
					</Button>
					<Button
						variant={setup.completedTricksVisible ? "ghost" : "default"}
						size="sm"
						onPress={() => onConfigure({ ...setup, completedTricksVisible: false })}
					>
						{t("off")}
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
	name,
	onNameChange,
	onKick,
}: {
	seat: SeatView;
	slot: LobbySlot;
	onReady?: (ready: boolean) => void;
	name?: string;
	onNameChange?: (name: string) => void;
	onKick?: (seatId: SeatId) => void;
}) {
	const { t } = useI18n();
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
			<SeatAvatar seat={seat} self={self} showName={!(self && !empty && name !== undefined)} />
			{self && !empty && name !== undefined ? (
				<TextField
					className={styles.chairNameField}
					value={name}
					onChange={onNameChange}
					isDisabled={onNameChange === undefined}
				>
					<Label className="sr-only">{t("yourName")}</Label>
					<Input
						className="h-9 min-h-9 px-2 text-center"
						placeholder={t("yourName")}
						autoComplete="nickname"
						maxLength={DISPLAY_NAME_MAX}
						spellCheck="false"
					/>
				</TextField>
			) : null}
			{self && !empty ? (
				<Button variant="ghost" size="sm" onPress={() => onReady?.(!seat.ready)}>
					{seat.ready ? t("ready") : t("sitReady")}
				</Button>
			) : seat.ready ? (
				<span className={styles.readyMark}>{t("ready")}</span>
			) : null}
			{!self && !empty && onKick ? (
				<Button variant="ghost" size="sm" onPress={() => onKick(seat.seatId)}>
					{t("remove")}
				</Button>
			) : null}
		</div>
	);
}

function currentSetup(view: TableView): LobbySetup {
	return {
		difficulty: view.chrome.difficulty ?? DEFAULT_MISSION_DIFFICULTY,
		captainSeat: view.seats.find((seat) => seat.isCaptain)?.seatId ?? null,
		distressDisabled: view.chrome.flags.distressDisabled,
		completedTricksVisible: view.chrome.flags.completedTricksVisible,
	};
}

function setupCopy(view: TableView, setup: LobbySetup, t: ReturnType<typeof useI18n>["t"]): string {
	const captain = view.seats.find((seat) => seat.isCaptain);
	const captainLabel = captain === undefined ? t("random") : captainPickLabel(captain, t);
	const distress = setup.distressDisabled ? t("off") : t("on");
	return t("setup", { difficulty: setup.difficulty, captain: captainLabel, distress });
}

function captainPickLabel(seat: SeatView, t: ReturnType<typeof useI18n>["t"]): string {
	if (seat.region === "seat.self") {
		return t("you");
	}
	if (seatIsEmpty(seat)) {
		return `${t("seat")} ${seat.seatId + 1}`;
	}
	return seatName(seat, t);
}
