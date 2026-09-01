import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useI18n } from "../lib/i18n.tsx";

export const Route = createFileRoute("/assets")({
	component: AssetsLayout,
});

function AssetsLayout() {
	const { t } = useI18n();
	return (
		<section className="@container mx-auto grid w-full max-w-[56rem] gap-6 py-4 pb-10">
			<nav
				className="flex flex-wrap items-baseline justify-center gap-x-5 gap-y-1"
				aria-label={t("assetsNav")}
			>
				<Link
					className="inline-flex min-h-11 items-center text-sm tracking-widest text-muted-foreground uppercase no-underline hover:text-primary"
					to="/assets"
				>
					{t("assets")}
				</Link>
				<Link
					className="inline-flex min-h-11 items-center text-muted-foreground no-underline hover:text-primary data-active:text-primary"
					to="/assets/missions"
					activeProps={{ "data-active": "true" }}
				>
					{t("missionTasks")}
				</Link>
				<Link
					className="inline-flex min-h-11 items-center text-muted-foreground no-underline hover:text-primary data-active:text-primary"
					to="/assets/playing-cards"
					activeProps={{ "data-active": "true" }}
				>
					{t("playingCards")}
				</Link>
			</nav>
			<Outlet />
			<Link
				className="inline-flex min-h-11 items-center justify-self-center text-muted-foreground no-underline hover:text-primary"
				to="/"
			>
				{t("backToTable")}
			</Link>
		</section>
	);
}
