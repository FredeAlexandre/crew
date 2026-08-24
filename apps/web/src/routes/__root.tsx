import { createRootRoute, HeadContent, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { IdentitySheetProvider } from "../components/identity-sheet.tsx";
import { ProfileControl } from "../components/ProfileControl.tsx";
import { I18nProvider, type Locale, useI18n } from "../lib/i18n.tsx";
import styles from "../styles/root.module.css";
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
				<div className={styles.shell} data-table={atTable ? "true" : undefined}>
					<header className={styles.bar}>
						{atTable ? (
							<Link
								className={styles.home}
								to="/"
								onClick={() => window.dispatchEvent(new Event("crew:leave-table"))}
							>
								{t("table")}
							</Link>
						) : (
							<span />
						)}
						<div className={styles.accountControls}>
							<label className={styles.localeLabel}>
								<span className={styles.srOnly}>{t("language")}</span>
								<select
									value={locale}
									onChange={(event) => setLocale(event.target.value as Locale)}
								>
									<option value="fr">FR</option>
									<option value="es">ES</option>
									<option value="en">EN</option>
								</select>
							</label>
							<ProfileControl />
						</div>
					</header>
					<main className={styles.main}>
						<Outlet />
					</main>
				</div>
			</IdentitySheetProvider>
			<TanStackRouterDevtools position="bottom-left" />
		</>
	);
}
