import { fixtures, type TableView } from "@crew/view-model/fixtures";
import { createRoot } from "react-dom/client";
import { GeometryTable } from "./src/skins/geometry/Table.tsx";
import styles from "./src/styles/root.module.css";
import "./src/styles/tokens.css";

const params = new URLSearchParams(window.location.search);
const name = params.get("f") ?? "play.midTrick.fourPlayers";
const view = (fixtures as Record<string, TableView>)[name] ?? fixtures["play.midTrick.fourPlayers"];
const root = document.getElementById("app");
if (!root) {
	throw new Error("missing app");
}
createRoot(root).render(
	<div className={styles.shell} data-table="true">
		<header className={styles.bar}>
			<span className={styles.home}>Table</span>
		</header>
		<main className={styles.main}>
			<GeometryTable view={view} />
		</main>
	</div>,
);
