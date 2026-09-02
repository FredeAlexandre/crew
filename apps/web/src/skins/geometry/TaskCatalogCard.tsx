import type { TaskPublic } from "@crew/protocol";
import type { TaskView } from "@crew/view-model/fixtures";
import { Button } from "react-aria-components";
import { useI18n } from "../../lib/i18n.tsx";
import { TaskCatalogArt } from "./TaskCatalogArt.tsx";
import styles from "./task-catalog-card.module.css";
import { type TaskRenderParams, taskCatalogLabel } from "./task-label.ts";

export type { TaskRenderParams } from "./task-label.ts";

export type TaskCardSize = "catalog" | "table" | "self" | "compact";

function DifficultyPips({ difficulty }: { difficulty: TaskPublic["difficulty"] }) {
	const { t } = useI18n();
	const groups = [
		{ label: "3", value: difficulty[3] },
		{ label: "4", value: difficulty[4] },
		{ label: "5", value: difficulty[5] },
	] as const;
	const pips = Math.max(4, ...groups.map((group) => group.value));

	return (
		<div className={styles.difficulty}>
			<span className={styles.srOnly}>
				{t("taskDifficulty", {
					three: difficulty[3],
					four: difficulty[4],
					five: difficulty[5],
				})}
			</span>
			{groups.map(({ label, value }) => (
				<span key={label} className={styles.difficultyGroup}>
					<span className={styles.playerLabel}>{label}</span>
					{Array.from({ length: pips }, (_, index) => (
						<span
							key={index}
							className={styles.pip}
							data-on={index < value ? "true" : undefined}
							aria-hidden="true"
						/>
					))}
				</span>
			))}
		</div>
	);
}

function taskAriaLabel(
	caption: string,
	status: TaskView["status"] | undefined,
	t: ReturnType<typeof useI18n>["t"],
): string {
	if (status === "completed") {
		return t("taskStatusComplete", { caption });
	}
	if (status === "failed") {
		return t("taskStatusFailed", { caption });
	}
	return caption;
}

export function TaskCatalogMeta({ task }: { task: TaskPublic }) {
	return (
		<div className={styles.meta}>
			<span className={styles.id}>{task.id}</span>
			<DifficultyPips difficulty={task.difficulty} />
		</div>
	);
}

export function TaskCatalogCard({
	task,
	size = "catalog",
	status,
	takeable = false,
	muted = false,
	region,
	prediction,
	params,
	onPress,
}: {
	task: TaskPublic;
	size?: TaskCardSize;
	status?: TaskView["status"];
	takeable?: boolean;
	muted?: boolean;
	region?: TaskView["region"];
	prediction?: number | null;
	params?: TaskRenderParams;
	onPress?: () => void;
}) {
	const { t } = useI18n();
	const base = taskCatalogLabel(task, t, params);
	const caption =
		prediction !== undefined && prediction !== null ? `${base} (${prediction})` : base;
	const label = taskAriaLabel(caption, status, t);
	const inner = (
		<>
			<div className={styles.artSlot}>
				<TaskCatalogArt spec={task} params={params} />
			</div>
			<p className={styles.caption}>{caption}</p>
		</>
	);

	if (onPress) {
		return (
			<Button
				className={styles.card}
				data-kind={task.kind}
				data-size={size}
				data-status={status}
				data-takeable={takeable ? "true" : undefined}
				data-muted={muted ? "true" : undefined}
				data-region={region}
				aria-label={label}
				onPress={onPress}
			>
				{inner}
			</Button>
		);
	}

	return (
		<article
			className={styles.card}
			data-kind={task.kind}
			data-size={size}
			data-status={status}
			data-takeable={takeable ? "true" : undefined}
			data-muted={muted ? "true" : undefined}
			data-region={region}
			aria-label={label}
		>
			{inner}
		</article>
	);
}
