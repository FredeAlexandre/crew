import { createFileRoute } from "@tanstack/react-router";
import { useTable } from "../hooks/use-table.ts";
import styles from "../styles/playground.module.css";

export const Route = createFileRoute("/playground")({
	component: PlaygroundRoute,
});

function PlaygroundRoute() {
	const table = useTable("playground");

	return (
		<section className={styles.table}>
			<h1>Playground</h1>
			<p>Echo WS proves the worker pipe. Scene fixtures come later.</p>
			<div className={styles.echo}>
				<button type="button" onClick={table.connect}>
					Open echo socket ({table.status})
				</button>
				<button type="button" onClick={() => table.sendIntent("ping")}>
					Send ping
				</button>
				<pre className={styles.log}>{JSON.stringify(table.facts, null, 2)}</pre>
			</div>
		</section>
	);
}
