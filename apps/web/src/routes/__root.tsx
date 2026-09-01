import { createRootRoute, HeadContent, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { IdentitySheetProvider } from "../components/identity-sheet.tsx";
import { LanguageFlag } from "../components/LanguageFlag.tsx";
import { ProfileControl } from "../components/ProfileControl.tsx";
import { I18nProvider, useI18n } from "../lib/i18n.tsx";
import { cn } from "../lib/utils.ts";
import "../styles/tokens.css";

export const Route = createRootRoute({
	component: RootComponent,
	head: () => ({
		meta: [
			{ title: "Crew" },
			{
				name: "description",
				content: "A playable digital Crew for 3–5 seated players.",
			},
		],
	}),
});

function RootComponent() {
	return (
		<I18nProvider>
			<RootShell />
		</I18nProvider>
	);
}

function RootShell() {
	const { t } = useI18n();
	const pathname = useRouterState({ select: (state) => state.location.pathname });
	const atTable = pathname.startsWith("/lobby/");
	const atHome = pathname === "/";
	return (
		<>
			<HeadContent />
			<IdentitySheetProvider>
				<div
					className={cn(
						"grid min-h-dvh w-full max-w-full grid-rows-[auto_minmax(0,1fr)] p-[max(0.5rem,env(safe-area-inset-top,0px))_max(0.5rem,env(safe-area-inset-right,0px))_max(0.7rem,env(safe-area-inset-bottom,0px))_max(0.5rem,env(safe-area-inset-left,0px))] sm:p-5",
						atTable && "h-dvh max-h-dvh overflow-hidden",
						atHome && "relative grid-rows-[minmax(0,1fr)] p-0 sm:p-0",
					)}
					data-table={atTable ? "true" : undefined}
				>
					<header
						className={cn(
							"mb-1.5 flex min-h-11 items-center justify-between gap-3",
							atHome &&
								"pointer-events-none absolute inset-x-0 top-0 z-20 mb-0 justify-end p-[max(0.5rem,env(safe-area-inset-top,0px))_max(0.5rem,env(safe-area-inset-right,0px))_0_max(0.5rem,env(safe-area-inset-left,0px))]",
						)}
					>
						{atTable ? (
							<Link
								className="text-muted-foreground no-underline hover:text-primary focus-visible:text-primary"
								to="/"
								onClick={() => window.dispatchEvent(new Event("crew:leave-table"))}
							>
								{t("table")}
							</Link>
						) : atHome ? null : (
							<span />
						)}
						<div className={cn("flex items-center gap-2", atHome && "pointer-events-auto")}>
							<LanguageFlag />
							<ProfileControl />
						</div>
					</header>
					<main className={cn("grid min-h-0 min-w-0", atTable && "overflow-hidden")}>
						<Outlet />
					</main>
				</div>
			</IdentitySheetProvider>
			<TanStackRouterDevtools position="bottom-left" />
		</>
	);
}
