import { echoFact, echoIntentSchema } from "@crew/protocol";
import { describe, expect, it } from "vitest";

describe("room echo", () => {
	it("fans out a fact with a bumped seq", () => {
		const intent = echoIntentSchema.parse({
			type: "echo",
			attemptId: "attempt-1",
			seq: 0,
			payload: "ping",
		});
		expect(echoFact(intent, 4).seq).toBe(4);
	});
});
