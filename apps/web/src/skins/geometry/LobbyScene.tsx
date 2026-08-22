import type { TableView } from "@crew/view-model/fixtures";
import { Button } from "react-aria-components";
import { seatIsEmpty, seatName } from "./copy.ts";
import styles from "./scenes.module.css";

export type LobbyActions = {
	roomCode?: string;
	copied?: boolean;
	statusNote?: string | null;
	alert?: string | null;
	onCopyCode?: () => void;
	onReady?: (ready: boolean) => void;
	onStart?: () => void;
};

export function LobbyScene({ view, actions }: { view: TableView; actions?: LobbyActions }) {
	const code = actions?.roomCode || "————";
	return (
		<div className={styles.board} data-scene={view.scene}>
			<p className={styles.kicker}>Crew</p>
			<Button
				className={styles.code}
				onPress={actions?.onCopyCode}
				isDisabled={!actions?.onCopyCode}
				aria-label={`Lobby code ${code}`}
			>
				{code}
			</Button>
			<p className={styles.lede}>Share this code. Empty chairs stay empty until someone sits.</p>
			<div className={styles.arc}>
				{view.seats.map((seat) => {
					const empty = seatIsEmpty(seat);
					return (
						<div
							key={seat.region}
							className={styles.chair}
							data-region={seat.region}
							data-empty={empty ? "true" : "false"}
							data-ready={seat.ready ? "true" : "false"}
							data-self={seat.region === "seat.self" ? "true" : "false"}
						>
							<span
								className={styles.notch}
								data-empty={empty ? "true" : "false"}
								data-self={seat.region === "seat.self" ? "true" : "false"}
								data-ready={seat.ready ? "true" : "false"}
							/>
							<span className={styles.chairName}>{empty ? "Empty" : seatName(seat)}</span>
							{seat.region === "seat.self" && !empty ? (
								<Button className={styles.ghost} onPress={() => actions?.onReady?.(!seat.ready)}>
									{seat.ready ? "Ready" : "Sit ready"}
								</Button>
							) : seat.ready ? (
								<span className={styles.readyMark}>Ready</span>
							) : null}
						</div>
					);
				})}
			</div>
			<div className={styles.boardActions}>
				{actions?.onStart ? (
					<Button className={styles.primary} onPress={actions.onStart}>
						Start
					</Button>
				) : null}
			</div>
			{actions?.copied ? <p className={styles.lede}>Copied.</p> : null}
			{actions?.statusNote ? <p className={styles.lede}>{actions.statusNote}</p> : null}
			{actions?.alert ? (
				<p className={styles.alert} role="alert">
					{actions.alert}
				</p>
			) : null}
		</div>
	);
}
