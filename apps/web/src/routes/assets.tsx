import { createFileRoute, Link, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/assets")({
	component: AssetsLayout,
});

function AssetsLayout() {
	return (
		<section className="@container mx-auto grid w-full max-w-[56rem] gap-6 py-4 pb-10">
			<nav
				className="flex flex-wrap items-baseline justify-center gap-x-5 gap-y-1"
				aria-label="Asset catalogs"
			>
				<Link
					className="inline-flex min-h-11 items-center text-sm tracking-widest text-muted-foreground uppercase no-underline hover:text-primary"
					to="/assets"
				>
					Assets
				</Link>
				<Link
					className="inline-flex min-h-11 items-center text-muted-foreground no-underline hover:text-primary data-active:text-primary"
					to="/assets/missions"
					activeProps={{ "data-active": "true" }}
				>
					Mission tasks
				</Link>
				<Link
					className="inline-flex min-h-11 items-center text-muted-foreground no-underline hover:text-primary data-active:text-primary"
					to="/assets/playing-cards"
					activeProps={{ "data-active": "true" }}
				>
					Playing cards
				</Link>
			</nav>
			<Outlet />
			<Link
				className="inline-flex min-h-11 items-center justify-self-center text-muted-foreground no-underline hover:text-primary"
				to="/"
			>
				Back to table
			</Link>
		</section>
	);
}
