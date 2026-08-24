import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import styles from "../styles/assets.module.css";

export const Route = createFileRoute("/assets")({
	component: AssetsLayout,
});

function AssetsLayout() {
	return (
		<section className={styles.layout}>
			<nav className={styles.nav} aria-label="Asset catalogs">
				<Link className={styles.brand} to="/assets">
					Assets
				</Link>
				<Link
					className={styles.navLink}
					to="/assets/missions"
					activeProps={{ "data-active": "true" }}
				>
					Mission tasks
				</Link>
				<Link
					className={styles.navLink}
					to="/assets/playing-cards"
					activeProps={{ "data-active": "true" }}
				>
					Playing cards
				</Link>
			</nav>
			<Outlet />
			<Link className={styles.back} to="/">
				Back to table
			</Link>
		</section>
	);
}
