import {
	DEFAULT_MISSION_DIFFICULTY,
	MISSION_DIFFICULTY_MAX,
	MISSION_DIFFICULTY_MIN,
	PLAYER_COUNTS,
	type PlayerCount,
	type SeatId,
} from "@crew/protocol";
import type { SeatView, TableView } from "@crew/view-model/fixtures";
import { BotIcon, SettingsIcon, UserXIcon } from "lucide-react";
import { useState } from "react";
import { type Key, Button as Pressable, TextField } from "react-aria-components";
import {
	AlertDialog,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "../../components/ui/alert-dialog.tsx";
import { Button } from "../../components/ui/button.tsx";
import {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerHeader,
	DrawerTitle,
} from "../../components/ui/drawer.tsx";
import {
	DropdownMenu,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu.tsx";
import { Input } from "../../components/ui/input.tsx";
import { Label } from "../../components/ui/label.tsx";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "../../components/ui/select.tsx";
import { Switch } from "../../components/ui/switch.tsx";
import { DISPLAY_NAME_MAX } from "../../lib/display-name.ts";
import { useI18n } from "../../lib/i18n.tsx";
import { type LobbySlot, lobbySlot, seatIsBot, seatIsEmpty, seatName } from "./copy.ts";
import { SeatAvatar } from "./parts.tsx";
import styles from "./scenes.module.css";

const RANDOM_CAPTAIN = "random";
const SEAT_COUNT_MIN = PLAYER_COUNTS[0];
const SEAT_COUNT_MAX = PLAYER_COUNTS[PLAYER_COUNTS.length - 1];

export type LobbySetup = {
	difficulty: number;
	captainSeat: SeatId | null;
	distressDisabled: boolean;
	completedTricksVisible: boolean;
	playerCount: PlayerCount;
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
	onKick?: (seatId: SeatId) => void;
	onFillBot?: (seatId: SeatId) => void;
	onConfigure?: (setup: LobbySetup) => void;
	onStart?: () => void;
};

export function LobbyScene({ view, actions }: { view: TableView; actions?: LobbyActions }) {
	const { t } = useI18n();
	const code = actions?.roomCode || "————";
	const setup = currentSetup(view);
	const roomFull = view.seats.every((seat) => !seatIsEmpty(seat));
	const [kickSeat, setKickSeat] = useState<SeatView | null>(null);
	const kickName = kickSeat === null ? "" : seatName(kickSeat, t);
	const kickCopy =
		kickSeat !== null && seatIsBot(kickSeat)
			? t("kickConfirmBotCopy")
			: t("kickConfirmCopy", { name: kickName });

	function confirmKick() {
		if (kickSeat === null) {
			return;
		}
		actions?.onKick?.(kickSeat.seatId);
		setKickSeat(null);
	}

	return (
		<div className={`${styles.board} ${styles.lobby}`} data-scene={view.scene}>
			<header className={styles.lobbyHead}>
				<Button
					variant="ghost"
					className="font-heading h-auto px-0 text-2xl font-semibold tracking-widest uppercase"
					onPress={actions?.onCopyCode}
					isDisabled={!actions?.onCopyCode}
					aria-label={t("copyLobbyLink", { code })}
				>
					{code}
				</Button>
				{actions?.copied ? <p className={styles.lede}>{t("linkCopied")}</p> : null}
			</header>
			<div className={styles.ring} data-count={String(view.playerCount)}>
				{view.seats.map((seat) => (
					<Chair
						key={seat.seatId}
						seat={seat}
						slot={lobbySlot(seat.region, view.playerCount)}
						onReady={actions?.onReady}
						name={actions?.name}
						onNameChange={actions?.onNameChange}
						onKick={actions?.onKick ? () => setKickSeat(seat) : undefined}
						onFillBot={actions?.onFillBot}
					/>
				))}
				<div className={styles.lobbyWell}>
					<SetupDrawer view={view} setup={setup} onConfigure={actions?.onConfigure} />
					{actions?.statusNote ? <p className={styles.lede}>{actions.statusNote}</p> : null}
					{actions?.alert ? (
						<p className={styles.alert} role="alert">
							{actions.alert}
						</p>
					) : null}
				</div>
			</div>
			<div className={styles.lobbyPlay}>
				<Button
					className="w-full"
					size="lg"
					isDisabled={!roomFull || !actions?.onStart}
					onPress={actions?.onStart}
				>
					{t("play")}
				</Button>
			</div>
			<AlertDialog
				isOpen={kickSeat !== null}
				onOpenChange={(open) => {
					if (!open) {
						setKickSeat(null);
					}
				}}
			>
				<AlertDialogHeader>
					<AlertDialogTitle>{t("kick")}</AlertDialogTitle>
					<AlertDialogDescription>{kickCopy}</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<Button variant="outline" slot="close">
						{t("cancel")}
					</Button>
					<Button variant="destructive" onPress={confirmKick}>
						{t("kick")}
					</Button>
				</AlertDialogFooter>
			</AlertDialog>
		</div>
	);
}

function SetupDrawer({
	view,
	setup,
	onConfigure,
}: {
	view: TableView;
	setup: LobbySetup;
	onConfigure?: (setup: LobbySetup) => void;
}) {
	const { t } = useI18n();
	const [open, setOpen] = useState(false);
	const captainKey = setup.captainSeat === null ? RANDOM_CAPTAIN : String(setup.captainSeat);
	const canDropSeat = lastSeatIsEmpty(view) && setup.playerCount > SEAT_COUNT_MIN;

	function apply(patch: Partial<LobbySetup>) {
		onConfigure?.({ ...setup, completedTricksVisible: true, ...patch });
	}

	function onCaptainChange(key: Key | null) {
		if (key === null) {
			return;
		}
		apply({
			captainSeat: key === RANDOM_CAPTAIN ? null : (Number(key) as SeatId),
		});
	}

	return (
		<>
			<Button variant="outline" onPress={() => setOpen(true)}>
				{t("settings")}
				<SettingsIcon data-icon="inline-end" aria-hidden />
			</Button>
			<Drawer open={open} onOpenChange={setOpen} showSwipeHandle>
				<DrawerContent className="pb-[max(1.25rem,env(safe-area-inset-bottom,0px))]">
					<DrawerHeader>
						<DrawerTitle>{t("settings")}</DrawerTitle>
						<DrawerDescription className="sr-only">{t("settings")}</DrawerDescription>
					</DrawerHeader>
					<div className={styles.setupDrawer}>
						<div className={styles.setupRow}>
							<span className={styles.setupLabel}>{t("seats")}</span>
							<Button
								variant="ghost"
								size="icon"
								isDisabled={onConfigure === undefined || !canDropSeat}
								onPress={() => apply({ playerCount: (setup.playerCount - 1) as PlayerCount })}
								aria-label={t("fewerSeats")}
							>
								–
							</Button>
							<span className={styles.setupValue}>{setup.playerCount}</span>
							<Button
								variant="ghost"
								size="icon"
								isDisabled={onConfigure === undefined || setup.playerCount >= SEAT_COUNT_MAX}
								onPress={() => apply({ playerCount: (setup.playerCount + 1) as PlayerCount })}
								aria-label={t("moreSeats")}
							>
								+
							</Button>
						</div>
						<div className={styles.setupRow}>
							<span className={styles.setupLabel}>{t("difficulty")}</span>
							<Button
								variant="ghost"
								size="icon"
								isDisabled={onConfigure === undefined || setup.difficulty <= MISSION_DIFFICULTY_MIN}
								onPress={() => apply({ difficulty: setup.difficulty - 1 })}
								aria-label={t("lowerDifficulty")}
							>
								–
							</Button>
							<span className={styles.setupValue}>{setup.difficulty}</span>
							<Button
								variant="ghost"
								size="icon"
								isDisabled={onConfigure === undefined || setup.difficulty >= MISSION_DIFFICULTY_MAX}
								onPress={() => apply({ difficulty: setup.difficulty + 1 })}
								aria-label={t("raiseDifficulty")}
							>
								+
							</Button>
						</div>
						<Select
							className="w-full"
							selectedKey={captainKey}
							onSelectionChange={onCaptainChange}
							isDisabled={onConfigure === undefined}
						>
							<Label>{t("captain")}</Label>
							<SelectTrigger className="w-full">
								<SelectValue />
							</SelectTrigger>
							<SelectContent placement="top">
								<SelectItem id={RANDOM_CAPTAIN}>{t("random")}</SelectItem>
								{view.seats.map((seat) => (
									<SelectItem key={seat.seatId} id={String(seat.seatId)}>
										{captainPickLabel(seat, t)}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<div className={styles.setupSwitch}>
							<span className={styles.setupLabel}>{t("distress")}</span>
							<Switch
								isSelected={!setup.distressDisabled}
								isDisabled={onConfigure === undefined}
								onChange={(selected) => apply({ distressDisabled: !selected })}
							>
								<span className="sr-only">{t("distress")}</span>
							</Switch>
						</div>
					</div>
				</DrawerContent>
			</Drawer>
		</>
	);
}

function Chair({
	seat,
	slot,
	onReady,
	name,
	onNameChange,
	onKick,
	onFillBot,
}: {
	seat: SeatView;
	slot: LobbySlot;
	onReady?: (ready: boolean) => void;
	name?: string;
	onNameChange?: (name: string) => void;
	onKick?: () => void;
	onFillBot?: (seatId: SeatId) => void;
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
			{empty && !self && onFillBot ? (
				<EmptySeatFill seat={seat} onFillBot={onFillBot} />
			) : !self && !empty && onKick ? (
				<OccupiedSeatKick seat={seat} onKick={onKick} />
			) : (
				<SeatAvatar seat={seat} self={self} showName={!(self && !empty && name !== undefined)} />
			)}
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
		</div>
	);
}

function EmptySeatFill({
	seat,
	onFillBot,
}: {
	seat: SeatView;
	onFillBot: (seatId: SeatId) => void;
}) {
	const { t } = useI18n();
	return (
		<DropdownMenuTrigger>
			<Pressable className={styles.emptySeatTrigger} aria-label={t("fillSeatWithBot")}>
				<SeatAvatar seat={seat} />
			</Pressable>
			<DropdownMenu placement="bottom" offset={6} showArrow className="min-w-0 rounded-full px-0.5">
				<DropdownMenuItem
					textValue={t("bot")}
					onAction={() => {
						onFillBot(seat.seatId);
					}}
				>
					<BotIcon />
					{t("bot")}
				</DropdownMenuItem>
			</DropdownMenu>
		</DropdownMenuTrigger>
	);
}

function OccupiedSeatKick({ seat, onKick }: { seat: SeatView; onKick: () => void }) {
	const { t } = useI18n();
	return (
		<DropdownMenuTrigger>
			<Pressable
				className={styles.emptySeatTrigger}
				aria-label={t("kickSeat", { name: seatName(seat, t) })}
			>
				<SeatAvatar seat={seat} />
			</Pressable>
			<DropdownMenu placement="bottom" offset={6} showArrow className="min-w-0 rounded-full px-0.5">
				<DropdownMenuItem textValue={t("kick")} variant="destructive" onAction={onKick}>
					<UserXIcon />
					{t("kick")}
				</DropdownMenuItem>
			</DropdownMenu>
		</DropdownMenuTrigger>
	);
}

function currentSetup(view: TableView): LobbySetup {
	return {
		difficulty: view.chrome.difficulty ?? DEFAULT_MISSION_DIFFICULTY,
		captainSeat: view.seats.find((seat) => seat.isCaptain)?.seatId ?? null,
		distressDisabled: view.chrome.flags.distressDisabled,
		completedTricksVisible: true,
		playerCount: asPlayerCount(view.playerCount),
	};
}

function asPlayerCount(value: number): PlayerCount {
	if (value === 3 || value === 4 || value === 5) {
		return value;
	}
	return 4;
}

function lastSeatIsEmpty(view: TableView): boolean {
	const last = view.seats.find((seat) => seat.seatId === view.playerCount - 1);
	return last !== undefined && seatIsEmpty(last);
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
