import type { SeatView, TableView } from "@crew/view-model/fixtures";
import { Button } from "react-aria-components";
import { type LobbySlot, lobbySlot, seatIsEmpty, seatName } from "./copy.ts";
import styles from "./scenes.module.css";

export type LobbyActions = {
	roomCode?: string;
	copied?: boolean;
	statusNote?: string | null;
	alert?: string | null;
	onCopyCode?: () => void;
	onReady?: (ready: boolean) => void;
	onFillBots?: () => void;
	onStart?: () => void;
};

export function LobbyScene({ view, actions }: { view: TableView; actions?: LobbyActions }) {
	const code = actions?.roomCode || "————";
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
			data-self={self ? "true" : "false"}
		>
			<span
				className={styles.notch}
				data-empty={empty ? "true" : "false"}
				data-self={self ? "true" : "false"}
				data-ready={seat.ready ? "true" : "false"}
			/>
			<span className={styles.chairName}>{empty ? "Empty" : seatName(seat)}</span>
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
