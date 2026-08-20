import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { authClient } from "../lib/auth-client.ts";
import styles from "../styles/boot.module.css";

export const Route = createFileRoute("/")({
	component: BootRoute,
});

function BootRoute() {
	const { data: session, isPending } = authClient.useSession();
	const [health, setHealth] = useState("checking");
	const [guestAction, setGuestAction] = useState<"idle" | "signing-in" | "signed-in" | "error">(
		"idle",
	);
	const [guestError, setGuestError] = useState("error");

	useEffect(() => {
		void fetch(new URL("/", import.meta.env.VITE_SERVER_URL).toString())
			.then(async (response) => {
				setHealth(response.ok ? await response.text() : "down");
			})
			.catch(() => setHealth("down"));
	}, []);

	async function becomeGuest() {
		if (session?.user) {
			return;
		}
		setGuestAction("signing-in");
		const result = await authClient.signIn.anonymous();
		if (result.error && result.error.code !== "ANONYMOUS_USERS_CANNOT_SIGN_IN_AGAIN_ANONYMOUSLY") {
			setGuestError(result.error.message ?? "error");
			setGuestAction("error");
			return;
		}
		setGuestAction("signed-in");
	}

	let guest = "idle";
	if (session?.user || guestAction === "signed-in") {
		guest = "signed-in";
	} else if (guestAction === "signing-in") {
		guest = "signing-in";
	} else if (isPending) {
		guest = "checking";
	} else if (guestAction === "error") {
		guest = guestError;
	}

	return (
		<section className={styles.stack}>
			<h1>Boot</h1>
			<p>Guest identity survives refresh. Play happens on the table, not here.</p>
			<p className={styles.status}>Worker health: {health}</p>
			<p className={styles.status}>Guest session: {guest}</p>
			<button
				type="button"
				disabled={
					Boolean(session?.user) || guestAction === "signing-in" || guestAction === "signed-in"
				}
				onClick={() => void becomeGuest()}
			>
				Create guest session
			</button>
		</section>
	);
}
