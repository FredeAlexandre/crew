import { CARD_IDS, COLOR_SUITS } from "@crew/protocol";
import { TASK_CATALOG_PUBLIC } from "@crew/view-model/catalog";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "../components/ui/card.tsx";
import { SuitMark } from "../skins/geometry/SuitMark.tsx";

export const Route = createFileRoute("/assets/")({
	component: AssetsIndexRoute,
	head: () => ({
		meta: [{ title: "Assets · Crew" }],
	}),
});

function AssetsIndexRoute() {
	return (
		<div className="grid gap-5">
			<header className="grid gap-2 text-center">
				<h1 className="font-heading m-0 text-[clamp(1.75rem,6vw,2.5rem)] font-semibold tracking-wider uppercase">
					Assets
				</h1>
				<p className="m-0 text-muted-foreground">
					Every card face used at the table, ready to check and restyle.
				</p>
			</header>
			<div className="@min-[36rem]:grid-cols-2 grid grid-cols-1 gap-4">
				<Link className="text-inherit no-underline" to="/assets/missions">
					<Card className="h-full min-h-11 transition-colors hover:ring-primary">
						<CardHeader>
							<CardTitle className="text-base">Mission tasks</CardTitle>
							<CardDescription>Task cards grouped by objective.</CardDescription>
						</CardHeader>
						<CardContent>
							<p className="m-0 text-sm text-muted-foreground">
								{TASK_CATALOG_PUBLIC.length} tasks
							</p>
						</CardContent>
					</Card>
				</Link>
				<Link className="text-inherit no-underline" to="/assets/playing-cards">
					<Card className="h-full min-h-11 transition-colors hover:ring-primary">
						<CardHeader>
							<CardTitle className="text-base">Playing cards</CardTitle>
							<CardDescription>Four color suits and submarine trump, as dealt.</CardDescription>
						</CardHeader>
						<CardContent className="grid gap-2">
							<div className="flex min-h-6 items-center gap-1.5" aria-hidden="true">
								{[...COLOR_SUITS, "submarine" as const].map((suit) => (
									<SuitMark key={suit} suit={suit} size="lg" />
								))}
							</div>
							<p className="m-0 text-sm text-muted-foreground">{CARD_IDS.length} cards</p>
						</CardContent>
					</Card>
				</Link>
			</div>
		</div>
	);
}
