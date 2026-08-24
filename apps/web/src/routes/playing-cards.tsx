import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/playing-cards")({
	beforeLoad: () => {
		throw redirect({ to: "/assets/playing-cards" });
	},
});
