import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { authClient } from "../lib/auth-client.ts";
import styles from "../styles/boot.module.css";

export const Route = createFileRoute("/")({
	component: BootRoute,
});

function BootRoute() {
	const [health, setHealth] = useState("checking");
	const [guest, setGuest] = useState("idle");

	useEffect(() => {
		void fetch(new URL("/", import.meta.env.VITE_SERVER_URL).toString())
			.then(async (response) => {
				setHealth(response.ok ? await response.text() : "down");
			})
			.catch(() => setHealth("down"));
	}, []);

	async function becomeGuest() {
		setGuest("signing-in");
		const result = await authClient.signIn.anonymous();
		setGuest(result.error ? (result.error.message ?? "error") : "signed-in");
	}

	return (
		<section className={styles.stack}>
			<h1>Boot</h1>
			<p>Guest identity survives refresh. Play happens on the table, not here.</p>
			<p className={styles.status}>Worker health: {health}</p>
			<p className={styles.status}>Guest session: {guest}</p>
			<button type="button" onClick={() => void becomeGuest()}>
				Create guest session
			</button>
		</section>
	);
}
