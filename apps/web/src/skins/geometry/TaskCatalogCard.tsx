import type { TaskPublic } from "@crew/protocol";
import { TaskCatalogArt } from "./TaskCatalogArt.tsx";
import styles from "./task-catalog-card.module.css";
import { taskCatalogLabel } from "./task-label.ts";

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

export function TaskCatalogCard({ task }: { task: TaskPublic }) {
	const caption = taskCatalogLabel(task);

	return (
		<article className={styles.card} data-kind={task.kind} aria-label={caption}>
			<div className={styles.top}>
				<span className={styles.id}>{task.id}</span>
				{task.captainMaySelect ? (
					<span className={styles.captain} title="Captain may select">
						C
					</span>
				) : null}
			</div>
			<div className={styles.artSlot}>
				<TaskCatalogArt spec={task} />
			</div>
			<p className={styles.caption}>{caption}</p>
			<div className={styles.footer}>
				<DifficultyPips difficulty={task.difficulty} />
			</div>
		</article>
	);
}
