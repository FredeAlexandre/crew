import {
	DEFAULT_MISSION_DIFFICULTY,
	MISSION_DIFFICULTY_MAX,
	MISSION_DIFFICULTY_MIN,
	type SeatId,
} from "@crew/protocol";
import type { SeatView, TableView } from "@crew/view-model/fixtures";
import { SettingsIcon } from "lucide-react";
import { useState } from "react";
import { type Key, Button as Pressable, TextField } from "react-aria-components";
import { Button } from "../../components/ui/button.tsx";
import {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerHeader,
	DrawerTitle,
} from "../../components/ui/drawer.tsx";
import { Input } from "../../components/ui/input.tsx";
import { Label } from "../../components/ui/label.tsx";
import { Popover, PopoverTrigger } from "../../components/ui/popover.tsx";
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
						key={seat.region}
						seat={seat}
						slot={lobbySlot(seat.region, view.playerCount)}
						onReady={actions?.onReady}
						name={actions?.name}
						onNameChange={actions?.onNameChange}
						onKick={actions?.onKick}
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
	onKick?: (seatId: SeatId) => void;
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
				<EmptySeatFill seat={seat} slot={slot} onFillBot={onFillBot} />
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
			{!self && !empty && !seatIsBot(seat) && onKick ? (
				<Button variant="ghost" size="sm" onPress={() => onKick(seat.seatId)}>
					{t("remove")}
				</Button>
			) : null}
		</div>
	);
}

function EmptySeatFill({
	seat,
	slot,
	onFillBot,
}: {
	seat: SeatView;
	slot: LobbySlot;
	onFillBot: (seatId: SeatId) => void;
}) {
	const { t } = useI18n();
	const [open, setOpen] = useState(false);
	return (
		<PopoverTrigger isOpen={open} onOpenChange={setOpen}>
			<Pressable className={styles.emptySeatTrigger} aria-label={t("fillSeatWithBot")}>
				<SeatAvatar seat={seat} />
			</Pressable>
			<Popover placement={emptySeatPopoverPlacement(slot)} className="w-auto min-w-28 gap-0 p-2">
				<Button
					variant="ghost"
					className="w-full"
					onPress={() => {
						onFillBot(seat.seatId);
						setOpen(false);
					}}
				>
					{t("bot")}
				</Button>
			</Popover>
		</PopoverTrigger>
	);
}

function emptySeatPopoverPlacement(slot: LobbySlot): "left" | "right" | "bottom" | "top" {
	if (slot === "west") {
		return "right";
	}
	if (slot === "east") {
		return "left";
	}
	if (slot === "self") {
		return "top";
	}
	return "bottom";
}

function currentSetup(view: TableView): LobbySetup {
	return {
		difficulty: view.chrome.difficulty ?? DEFAULT_MISSION_DIFFICULTY,
		captainSeat: view.seats.find((seat) => seat.isCaptain)?.seatId ?? null,
		distressDisabled: view.chrome.flags.distressDisabled,
		completedTricksVisible: true,
	};
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
