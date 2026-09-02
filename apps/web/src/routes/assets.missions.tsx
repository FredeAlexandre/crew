import { TASK_CATALOG_PUBLIC, type TaskKind, tasksGroupedByKind } from "@crew/view-model/catalog";
import { createFileRoute } from "@tanstack/react-router";
import { useI18n } from "../lib/i18n.tsx";
import { TaskCatalogCard, TaskCatalogMeta } from "../skins/geometry/TaskCatalogCard.tsx";

const TASK_KIND_KEYS: Record<TaskKind, { label: string; lede: string }> = {
	winCards: { label: "taskKindWinCards", lede: "taskKindWinCardsLede" },
	winColor: { label: "taskKindWinColor", lede: "taskKindWinColorLede" },
	winColors: { label: "taskKindWinColors", lede: "taskKindWinColorsLede" },
	winValue: { label: "taskKindWinValue", lede: "taskKindWinValueLede" },
	winSubmarines: { label: "taskKindWinSubmarines", lede: "taskKindWinSubmarinesLede" },
	winWith: { label: "taskKindWinWith", lede: "taskKindWinWithLede" },
	avoid: { label: "taskKindAvoid", lede: "taskKindAvoidLede" },
	noLead: { label: "taskKindNoLead", lede: "taskKindNoLeadLede" },
	trickCount: { label: "taskKindTrickCount", lede: "taskKindTrickCountLede" },
	predictTricks: { label: "taskKindPredictTricks", lede: "taskKindPredictTricksLede" },
	consecutiveTricks: { label: "taskKindConsecutiveTricks", lede: "taskKindConsecutiveTricksLede" },
	nthTrick: { label: "taskKindNthTrick", lede: "taskKindNthTrickLede" },
	skipFirstTricks: { label: "taskKindSkipFirstTricks", lede: "taskKindSkipFirstTricksLede" },
	compareTricks: { label: "taskKindCompareTricks", lede: "taskKindCompareTricksLede" },
	trickSum: { label: "taskKindTrickSum", lede: "taskKindTrickSumLede" },
	trickFilter: { label: "taskKindTrickFilter", lede: "taskKindTrickFilterLede" },
	collectAllColors: { label: "taskKindCollectAllColors", lede: "taskKindCollectAllColorsLede" },
	collectAllOfOneColor: {
		label: "taskKindCollectAllOfOneColor",
		lede: "taskKindCollectAllOfOneColorLede",
	},
	collectMoreColor: { label: "taskKindCollectMoreColor", lede: "taskKindCollectMoreColorLede" },
	collectEqualColor: { label: "taskKindCollectEqualColor", lede: "taskKindCollectEqualColorLede" },
};

export const Route = createFileRoute("/assets/missions")({
	component: MissionsRoute,
});

function MissionsRoute() {
	const { t } = useI18n();
	const groups = tasksGroupedByKind();

	return (
		<section className="@container grid gap-7">
			<header className="grid gap-2 text-center">
				<p className="m-0 text-sm tracking-widest text-muted-foreground uppercase">
					{t("logbook")}
				</p>
				<h1 className="font-heading m-0 text-[clamp(1.75rem,6vw,2.5rem)] font-semibold tracking-wider uppercase">
					{t("missionTasks")}
				</h1>
				<p className="m-0 text-muted-foreground">{t("missionTasksLede")}</p>
				<p className="m-0 text-sm text-muted-foreground">
					{t("missionTasksCount", { tasks: TASK_CATALOG_PUBLIC.length, types: groups.length })}
				</p>
			</header>

			<ul className="m-0 grid list-none gap-8 p-0">
				{groups.map((group) => (
					<li key={group.kind} className="grid gap-3.5">
						<div className="grid gap-1.5 px-0.5">
							<h2 className="m-0 text-lg font-semibold">{t(TASK_KIND_KEYS[group.kind].label)}</h2>
							<p className="m-0 text-sm text-muted-foreground">
								{t(TASK_KIND_KEYS[group.kind].lede)}
							</p>
						</div>
						<ul className="@min-[28rem]:grid-cols-[repeat(auto-fill,minmax(6.5rem,1fr))] @min-[42rem]:grid-cols-[repeat(auto-fill,minmax(7rem,1fr))] m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(5.75rem,1fr))] gap-x-2.5 gap-y-3.5 p-0 @min-[28rem]:gap-x-3 @min-[42rem]:gap-x-3.5">
							{group.tasks.map((task) => (
								<li key={task.id} className="grid justify-items-center gap-1.5">
									<TaskCatalogCard task={task} />
									<TaskCatalogMeta task={task} />
								</li>
							))}
						</ul>
					</li>
				))}
			</ul>
		</section>
	);
}
