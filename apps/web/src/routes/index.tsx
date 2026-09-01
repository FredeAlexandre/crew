import { createFileRoute } from "@tanstack/react-router";
import { HomeLanding } from "../components/HomeLanding.tsx";

export const Route = createFileRoute("/")({
	component: HomeLanding,
});
