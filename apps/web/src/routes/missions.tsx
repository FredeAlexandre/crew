import { TASK_CATALOG_PUBLIC, tasksGroupedByKind } from "@crew/view-model/catalog";
import { createFileRoute, Link } from "@tanstack/react-router";
import { taskCatalogLabel } from "../skins/geometry/task-label.ts";
import styles from "../styles/missions.module.css";

export const Route = createFileRoute("/missions")({
	component: MissionsRoute,
});

function difficultyCopy(difficulty: { 3: number; 4: number; 5: number }): string {
	return `3p ${difficulty[3]} · 4p ${difficulty[4]} · 5p ${difficulty[5]}`;
}

function MissionsRoute() {
	const groups = tasksGroupedByKind();

	return (
		<section className={styles.page}>
			<header className={styles.masthead}>
				<p className={styles.kicker}>Logbook</p>
				<h1 className={styles.title}>Mission tasks</h1>
				<p className={styles.lede}>Every task card in the game, grouped by objective type.</p>
				<p className={styles.summary}>
					{TASK_CATALOG_PUBLIC.length} tasks across {groups.length} types
				</p>
			</header>

			<ul className={styles.groups}>
				{groups.map((group) => (
					<li key={group.kind} className={styles.group}>
						<div className={styles.groupHead}>
							<h2 className={styles.groupTitle}>{group.label}</h2>
							<p className={styles.groupLede}>{group.lede}</p>
						</div>
						<ul className={styles.taskList}>
							{group.tasks.map((task) => (
								<li key={task.id} className={styles.task}>
									<div className={styles.taskMain}>
										<p className={styles.taskLabel}>{taskCatalogLabel(task)}</p>
										<div className={styles.taskMeta}>
											<span className={styles.taskId}>{task.id}</span>
											<span className={styles.difficulty}>{difficultyCopy(task.difficulty)}</span>
											{task.captainMaySelect ? (
												<span className={styles.captain}>Captain may select</span>
											) : null}
										</div>
									</div>
								</li>
							))}
						</ul>
					</li>
				))}
			</ul>

			<Link className={styles.back} to="/">
				Back to table
			</Link>
		</section>
	);
}
