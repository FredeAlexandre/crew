import { createRootRoute, HeadContent, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { IdentitySheetProvider } from "../components/identity-sheet.tsx";
import { ProfileControl } from "../components/ProfileControl.tsx";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "../components/ui/select.tsx";
import { I18nProvider, type Locale, useI18n } from "../lib/i18n.tsx";
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
	const { locale, setLocale, t } = useI18n();
	const pathname = useRouterState({ select: (state) => state.location.pathname });
	const atTable = pathname.startsWith("/lobby/");
	return (
		<>
			<HeadContent />
			<IdentitySheetProvider>
				<div
					className={cn(
						"grid min-h-dvh w-full max-w-full grid-rows-[auto_minmax(0,1fr)] p-[max(0.5rem,env(safe-area-inset-top,0px))_max(0.5rem,env(safe-area-inset-right,0px))_max(0.7rem,env(safe-area-inset-bottom,0px))_max(0.5rem,env(safe-area-inset-left,0px))] sm:p-5",
						atTable && "h-dvh max-h-dvh overflow-hidden",
					)}
					data-table={atTable ? "true" : undefined}
				>
					<header className="mb-1.5 flex min-h-11 items-center justify-between gap-3">
						{atTable ? (
							<Link
								className="text-muted-foreground no-underline hover:text-primary focus-visible:text-primary"
								to="/"
								onClick={() => window.dispatchEvent(new Event("crew:leave-table"))}
							>
								{t("table")}
							</Link>
						) : (
							<span />
						)}
						<div className="flex items-center gap-2">
							<Select
								aria-label={t("language")}
								selectedKey={locale}
								onSelectionChange={(key) => {
									if (key === "fr" || key === "es" || key === "en") {
										setLocale(key as Locale);
									}
								}}
							>
								<SelectTrigger className="w-16" size="sm">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem id="fr">FR</SelectItem>
									<SelectItem id="es">ES</SelectItem>
									<SelectItem id="en">EN</SelectItem>
								</SelectContent>
							</Select>
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
