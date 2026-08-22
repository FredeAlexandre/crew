import { lobbyThreeEmpty } from "@crew/view-model/fixtures";
import { describe, expect, it } from "vitest";
import { parseServerFrame } from "./parse-server-frame.ts";

describe("parseServerFrame", () => {
	it("parses a room.snapshot into a TableView", () => {
		const parsed = parseServerFrame(
			JSON.stringify({
				type: "room.snapshot",
				attemptId: null,
				seq: 0,
				viewModel: lobbyThreeEmpty,
			}),
		);
		expect(parsed).toEqual({ kind: "snapshot", view: lobbyThreeEmpty });
	});

	it("parses an error frame", () => {
		const parsed = parseServerFrame(
			JSON.stringify({
				type: "error",
				code: "notHost",
				message: "only the host can start",
			}),
		);
		expect(parsed).toEqual({
			kind: "error",
			code: "notHost",
			message: "only the host can start",
		});
	});

	it("rejects garbage", () => {
		expect(parseServerFrame("not json")).toBeNull();
		expect(parseServerFrame("{}")).toBeNull();
		expect(parseServerFrame(JSON.stringify({ type: "room.snapshot" }))).toBeNull();
		expect(
			parseServerFrame(
				JSON.stringify({
					type: "room.snapshot",
					attemptId: null,
					seq: 0,
					viewModel: { scene: "lobby" },
				}),
			),
		).toBeNull();
	});
});
