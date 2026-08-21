/**
 * 5 — fixtures (no engine)
 *
 *   nub ./5-fixtures/index.ts
 *
 * The skin binds to JSON. This script does not import `@crew/engine` or `/project`.
 * Consumers: `import { fixtures } from "@crew/view-model/fixtures"`.
 */
import { fixtures } from "../../src/fixtures.ts";
import { tableViewSchema } from "../../src/index.ts";
import { heading, note, showView } from "../show.ts";

heading("named snapshots");
for (const [name, view] of Object.entries(fixtures)) {
	note(`${name}  scene=${view.scene}  overlay=${view.overlay}  players=${view.playerCount}`);
}

const name = "play.midTrick.fourPlayers";
const fixture = fixtures[name];
if (fixture === undefined) {
	throw new Error(`missing ${name}`);
}

heading(name);
showView(fixture);

heading("reconnect");
const snapshot = JSON.stringify(fixture);
const restored = tableViewSchema.parse(JSON.parse(snapshot));
note(`${snapshot.length} bytes`);
note(`round-trip equal: ${JSON.stringify(restored) === snapshot}`);
note("Room sends this as room.snapshot — jump to it, do not replay animation backlog.");
