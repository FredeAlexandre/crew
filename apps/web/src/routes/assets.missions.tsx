import { TASK_CATALOG_PUBLIC, tasksGroupedByKind } from "@crew/view-model/catalog";
import { createFileRoute } from "@tanstack/react-router";
import { TaskCatalogCard } from "../skins/geometry/TaskCatalogCard.tsx";
import styles from "../styles/catalog.module.css";

export const Route = createFileRoute("/assets/missions")({
	component: MissionsRoute,
	head: () => ({
		meta: [{ title: "Mission tasks · Crew" }],
	}),
});

function MissionsRoute() {
	const groups = tasksGroupedByKind();

	return (
		<section className={styles.page}>
			<header className={styles.masthead}>
				<p className={styles.kicker}>Logbook</p>
				<h1 className={styles.title}>Mission tasks</h1>
				<p className={styles.lede}>
					Every task card in the game — read the illustration at a glance.
				</p>
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
						<ul className={styles.grid}>
							{group.tasks.map((task) => (
								<li key={task.id}>
									<TaskCatalogCard task={task} />
								</li>
							))}
						</ul>
					</li>
				))}
			</ul>
		</section>
	);
}
