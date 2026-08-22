import type { CardId } from "@crew/protocol";
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
	sendIntent,
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
			scene = (
				<DraftScene
					view={view}
					onTake={takeHandler(sendIntent, onTakeTask)}
					onPass={sendIntent ? () => sendIntent({ type: "task.pass" }) : onPassTask}
				/>
			);
			break;
		case "deal":
		case "play":
			scene = (
				<PlayScene
					view={view}
					onSkipDistress={sendIntent ? () => sendIntent({ type: "distress.skip" }) : onSkipDistress}
					onActivateDistress={onActivateDistress}
					onPlay={
						sendIntent ? (cardId: CardId) => sendIntent({ type: "card.play", cardId }) : undefined
					}
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

function takeHandler(
	sendIntent: ((intent: ClientIntent) => void) | undefined,
	onTakeTask: (() => void) | undefined,
): ((task: TaskView) => void) | undefined {
	if (sendIntent) {
		return (task) => sendIntent({ type: "task.take", taskInstanceId: task.instanceId });
	}
	if (onTakeTask) {
		return () => onTakeTask();
	}
	return undefined;
}
