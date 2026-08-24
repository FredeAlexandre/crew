import { CARD_IDS, COLOR_SUITS } from "@crew/protocol";
import { TASK_CATALOG_PUBLIC } from "@crew/view-model/catalog";
import { createFileRoute, Link } from "@tanstack/react-router";
import { SuitMark } from "../skins/geometry/SuitMark.tsx";
import styles from "../styles/assets.module.css";

export const Route = createFileRoute("/assets/")({
	component: AssetsIndexRoute,
});

function AssetsIndexRoute() {
	return (
		<div className={styles.hub}>
			<header className={styles.masthead}>
				<h1 className={styles.title}>Assets</h1>
				<p className={styles.lede}>
					Every card face used at the table, ready to check and restyle.
				</p>
			</header>
			<div className={styles.tiles}>
				<Link className={styles.tile} to="/assets/missions">
					<h2 className={styles.tileTitle}>Mission tasks</h2>
					<p className={styles.tileCopy}>The 96-card task set, grouped by objective.</p>
					<p className={styles.tileMeta}>{TASK_CATALOG_PUBLIC.length} tasks</p>
				</Link>
				<Link className={styles.tile} to="/assets/playing-cards">
					<h2 className={styles.tileTitle}>Playing cards</h2>
					<p className={styles.tileCopy}>Four color suits and submarine trump, as dealt.</p>
					<div className={styles.preview} aria-hidden="true">
						{[...COLOR_SUITS, "submarine" as const].map((suit) => (
							<SuitMark key={suit} suit={suit} size="lg" />
						))}
					</div>
					<p className={styles.tileMeta}>{CARD_IDS.length} cards</p>
				</Link>
			</div>
		</div>
	);
}
