import { createRootRoute, HeadContent, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
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
		<>
			<HeadContent />
			<div className={styles.shell}>
				<main className={styles.main}>
					<Outlet />
				</main>
			</div>
			<TanStackRouterDevtools position="bottom-left" />
		</>
	);
}
