import type { TableView } from "@crew/view-model/fixtures";
import { type ReactNode, useEffect, useRef } from "react";
import type { ClientIntent } from "../../hooks/use-table.ts";
import { unlockSfx } from "../../lib/sfx.ts";
import { BriefingScene, CampaignScene } from "./BriefingScene.tsx";
import { type LobbyActions, LobbyScene } from "./LobbyScene.tsx";
import { PlayScene } from "./PlayScene.tsx";
import { ResultScene } from "./ResultScene.tsx";
import styles from "./scenes.module.css";

type GeometryTableProps = {
	view: TableView;
	lobby?: LobbyActions;
	sendIntent?: (intent: ClientIntent) => void;
};

export function GeometryTable({ view, lobby, sendIntent }: GeometryTableProps) {
	const prevScene = useRef(view.scene);
	const enteredResult = view.scene === "result" && prevScene.current !== "result";

	useEffect(() => {
		prevScene.current = view.scene;
	}, [view.scene]);

	useEffect(() => {
		function unlock() {
			unlockSfx();
		}
		window.addEventListener("pointerdown", unlock);
		window.addEventListener("keydown", unlock);
		return () => {
			window.removeEventListener("pointerdown", unlock);
			window.removeEventListener("keydown", unlock);
		};
	}, []);
	let scene: ReactNode;
	switch (view.scene) {
		case "boot":
		case "lobby":
			scene = <LobbyScene view={view} actions={lobby} />;
			break;
		case "briefing":
			scene = <BriefingScene view={view} />;
			break;
		case "campaign":
			scene = <CampaignScene />;
			break;
		case "taskDraft":
		case "deal":
		case "play":
			scene = <PlayScene view={view} sendIntent={sendIntent} />;
			break;
		case "result":
			scene = (
				<ResultScene
					view={view}
					enter={enteredResult}
					onRetry={
						sendIntent ? (keepTasks) => sendIntent({ type: "host.retry", keepTasks }) : undefined
					}
				/>
			);
			break;
	}

	return (
		<div className={styles.frame} data-scene={view.scene} data-overlay={view.overlay}>
			{scene}
		</div>
	);
}
