import { createFileRoute } from "@tanstack/react-router";
import { Button } from "react-aria-components";

export const Route = createFileRoute("/lobby")({
	component: LobbyRoute,
});

function LobbyRoute() {
	return (
		<section>
			<h1>Lobby</h1>
			<p>
				Create and join by room code land with the table-flow task. This route is the scene shell.
			</p>
			<Button isDisabled>Create room (later)</Button>
		</section>
	);
}
