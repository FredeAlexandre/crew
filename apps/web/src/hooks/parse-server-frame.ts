import { type Fact, type RoomErrorCode, serverMessageSchema } from "@crew/protocol";
import { type TableView, tableViewSchema } from "@crew/view-model/fixtures";

type ParsedServerFrame =
	| { kind: "snapshot"; view: TableView }
	| { kind: "error"; code: RoomErrorCode; message: string }
	| { kind: "fact"; fact: Fact }
	| null;

export function parseServerFrame(raw: string): ParsedServerFrame {
	let json: unknown;
	try {
		json = JSON.parse(raw) as unknown;
	} catch {
		return null;
	}
	const message = serverMessageSchema.safeParse(json);
	if (!message.success) {
		return null;
	}
	if (message.data.type === "room.snapshot") {
		const view = tableViewSchema.safeParse(message.data.viewModel);
		if (!view.success) {
			return null;
		}
		return { kind: "snapshot", view: view.data };
	}
	if (message.data.type === "error") {
		return { kind: "error", code: message.data.code, message: message.data.message };
	}
	return { kind: "fact", fact: message.data };
}
