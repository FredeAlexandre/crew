import { createFileRoute } from "@tanstack/react-router";
import { PlayModeSelect } from "../components/PlayModeSelect.tsx";

export const Route = createFileRoute("/play")({
	component: PlayModeSelect,
});
