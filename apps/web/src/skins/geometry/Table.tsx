import type { TableView, TaskView } from "@crew/view-model/fixtures";
import type { ReactNode } from "react";
import type { ClientIntent } from "../../hooks/use-table.ts";
import { BriefingScene, CampaignScene } from "./BriefingScene.tsx";
import { DraftScene } from "./DraftScene.tsx";
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
			scene = (
				<DraftScene
					view={view}
					onTake={
						sendIntent
							? (task: TaskView) =>
									sendIntent({ type: "task.take", taskInstanceId: task.instanceId })
							: undefined
					}
					onPass={sendIntent ? () => sendIntent({ type: "task.pass" }) : undefined}
				/>
			);
			break;
		case "deal":
		case "play":
			scene = <PlayScene view={view} sendIntent={sendIntent} />;
			break;
		case "result":
			scene = (
				<ResultScene
					view={view}
					onRetry={sendIntent ? () => sendIntent({ type: "host.retry" }) : undefined}
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
