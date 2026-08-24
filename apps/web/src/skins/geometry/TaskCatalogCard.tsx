import type { TaskPublic } from "@crew/protocol";
import type { TaskView } from "@crew/view-model/fixtures";
import { Button } from "react-aria-components";
import { TaskCatalogArt } from "./TaskCatalogArt.tsx";
import styles from "./task-catalog-card.module.css";
import { taskCatalogLabel } from "./task-label.ts";

export type TaskCardSize = "catalog" | "table" | "self" | "compact";

function DifficultyPips({ difficulty }: { difficulty: TaskPublic["difficulty"] }) {
	const groups = [
		{ label: "3", value: difficulty[3] },
		{ label: "4", value: difficulty[4] },
		{ label: "5", value: difficulty[5] },
	] as const;

	return (
		<div className={styles.difficulty}>
			{groups.map(({ label, value }) => (
				<span key={label} className={styles.difficultyGroup}>
					<span className={styles.playerLabel}>{label}</span>
					{Array.from({ length: 4 }, (_, index) => (
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

function taskAriaLabel(caption: string, status: TaskView["status"] | undefined): string {
	if (status === "completed") {
		return `${caption}, complete`;
	}
	if (status === "failed") {
		return `${caption}, failed`;
	}
	return caption;
}

export function TaskCatalogCard({
	task,
	size = "catalog",
	status,
	takeable = false,
	showMeta,
	region,
	onPress,
}: {
	task: TaskPublic;
	size?: TaskCardSize;
	status?: TaskView["status"];
	takeable?: boolean;
	showMeta?: boolean;
	region?: TaskView["region"];
	onPress?: () => void;
}) {
	const caption = taskCatalogLabel(task);
	const chrome = showMeta ?? size === "catalog";
	const label = taskAriaLabel(caption, status);
	const inner = (
		<>
			{chrome ? (
				<div className={styles.top}>
					{size === "catalog" ? <span className={styles.id}>{task.id}</span> : <span />}
					{task.captainMaySelect ? (
						<span className={styles.captain} title="Captain may select">
							C
						</span>
					) : null}
				</div>
			) : null}
			<div className={styles.artSlot}>
				<TaskCatalogArt spec={task} />
			</div>
			<p className={styles.caption}>{caption}</p>
			{chrome ? (
				<div className={styles.footer}>
					<DifficultyPips difficulty={task.difficulty} />
				</div>
			) : null}
		</>
	);

	if (onPress) {
		return (
			<Button
				className={styles.card}
				data-kind={task.kind}
				data-size={size}
				data-chrome={chrome ? "true" : undefined}
				data-status={status}
				data-takeable={takeable ? "true" : undefined}
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
			data-chrome={chrome ? "true" : undefined}
			data-status={status}
			data-takeable={takeable ? "true" : undefined}
			data-region={region}
			aria-label={label}
		>
			{inner}
		</article>
	);
}
