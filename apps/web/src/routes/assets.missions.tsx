import { TASK_CATALOG_PUBLIC, tasksGroupedByKind } from "@crew/view-model/catalog";
import { createFileRoute } from "@tanstack/react-router";
import { TaskCatalogCard } from "../skins/geometry/TaskCatalogCard.tsx";

export const Route = createFileRoute("/assets/missions")({
	component: MissionsRoute,
	head: () => ({
		meta: [{ title: "Mission tasks · Crew" }],
	}),
});

function MissionsRoute() {
	const groups = tasksGroupedByKind();

	return (
		<section className="@container grid gap-7">
			<header className="grid gap-2 text-center">
				<p className="m-0 text-sm tracking-widest text-muted-foreground uppercase">Logbook</p>
				<h1 className="font-heading m-0 text-[clamp(1.75rem,6vw,2.5rem)] font-semibold tracking-wider uppercase">
					Mission tasks
				</h1>
				<p className="m-0 text-muted-foreground">
					Every task card in the game — read the illustration at a glance.
				</p>
				<p className="m-0 text-sm text-muted-foreground">
					{TASK_CATALOG_PUBLIC.length} tasks across {groups.length} types
				</p>
			</header>

			<ul className="m-0 grid list-none gap-8 p-0">
				{groups.map((group) => (
					<li key={group.kind} className="grid gap-3.5">
						<div className="grid gap-1.5 px-0.5">
							<h2 className="m-0 text-lg font-semibold">{group.label}</h2>
							<p className="m-0 text-sm text-muted-foreground">{group.lede}</p>
						</div>
						<ul className="@min-[28rem]:grid-cols-[repeat(auto-fill,minmax(7.25rem,1fr))] @min-[42rem]:grid-cols-[repeat(auto-fill,minmax(7.75rem,1fr))] m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(6.75rem,1fr))] gap-2.5 p-0 @min-[28rem]:gap-3 @min-[42rem]:gap-3.5">
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
