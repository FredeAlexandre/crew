import type { TableView } from "@crew/view-model/fixtures";
import type { ReactNode } from "react";
import { BriefingScene, CampaignScene } from "./BriefingScene.tsx";
import { DraftScene } from "./DraftScene.tsx";
import { type LobbyActions, LobbyScene } from "./LobbyScene.tsx";
import { PlayScene } from "./PlayScene.tsx";
import { ResultScene } from "./ResultScene.tsx";
import styles from "./scenes.module.css";

type GeometryTableProps = {
	view: TableView;
	lobby?: LobbyActions;
	onConfirmBriefing?: () => void;
	onTakeTask?: () => void;
	onPassTask?: () => void;
	onSkipDistress?: () => void;
	onActivateDistress?: () => void;
	onRetry?: () => void;
};

export function GeometryTable({
	view,
	lobby,
	onConfirmBriefing,
	onTakeTask,
	onPassTask,
	onSkipDistress,
	onActivateDistress,
	onRetry,
}: GeometryTableProps) {
	let scene: ReactNode;
	switch (view.scene) {
		case "boot":
		case "lobby":
			scene = <LobbyScene view={view} actions={lobby} />;
			break;
		case "briefing":
			scene = <BriefingScene view={view} onConfirm={onConfirmBriefing} />;
			break;
		case "campaign":
			scene = <CampaignScene />;
			break;
		case "taskDraft":
			scene = <DraftScene view={view} onTake={onTakeTask} onPass={onPassTask} />;
			break;
		case "deal":
		case "play":
			scene = (
				<PlayScene
					view={view}
					onSkipDistress={onSkipDistress}
					onActivateDistress={onActivateDistress}
				/>
			);
			break;
		case "result":
			scene = <ResultScene view={view} onRetry={onRetry} />;
			break;
	}

	return (
		<div className={styles.frame} data-scene={view.scene} data-overlay={view.overlay}>
			{scene}
		</div>
	);
}
