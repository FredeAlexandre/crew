import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/missions")({
	beforeLoad: () => {
		throw redirect({ to: "/assets/missions" });
	},
});
