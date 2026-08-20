import { createAttempt } from "@crew/engine";
import { describe, expect, it } from "vitest";
import { project } from "./project.ts";

describe("project", () => {
	it("exposes phase and player count for the viewer seat", () => {
		const { state } = createAttempt({
			attemptId: "a1",
			mission: { id: "m1", difficulty: 1 },
			playerCount: 4,
			seed: 1,
		});
		expect(project(state, 2)).toEqual({
			viewerSeat: 2,
			phase: "taskDraft",
			playerCount: 4,
		});
	});
});
