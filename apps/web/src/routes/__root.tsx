import { createRootRoute, HeadContent, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { ProfileControl } from "../components/ProfileControl.tsx";
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
	const pathname = useRouterState({ select: (state) => state.location.pathname });
	const atTable = pathname !== "/";

	return (
		<>
			<HeadContent />
			<div className={styles.shell}>
				<header className={styles.bar}>
					{atTable ? (
						<Link className={styles.home} to="/">
							Table
						</Link>
					) : (
						<span />
					)}
					<ProfileControl />
				</header>
				<main className={styles.main}>
					<Outlet />
				</main>
			</div>
			<TanStackRouterDevtools position="bottom-left" />
		</>
	);
}
