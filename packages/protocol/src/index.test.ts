import { describe, expect, it } from "vitest";
import { echoFact, echoIntentSchema } from "./index.ts";

describe("echoFact", () => {
	it("assigns the next seq and keeps the payload", () => {
		const intent = echoIntentSchema.parse({
			type: "echo",
			attemptId: "attempt-1",
			seq: 0,
			payload: { ping: true },
		});
		expect(echoFact(intent, 1)).toEqual({
			type: "echo",
			attemptId: "attempt-1",
			seq: 1,
			payload: { ping: true },
		});
	});
});
