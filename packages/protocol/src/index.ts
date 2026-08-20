import { z } from "zod";

/** Stable identities. Full deck and attempt types land in `engine-model`. */
export const playerIdSchema = z.string().min(1);
export const attemptIdSchema = z.string().min(1);
export const roomIdSchema = z.string().min(1);
export const seqSchema = z.number().int().nonnegative();

export type PlayerId = z.infer<typeof playerIdSchema>;
export type AttemptId = z.infer<typeof attemptIdSchema>;
export type RoomId = z.infer<typeof roomIdSchema>;
export type Seq = z.infer<typeof seqSchema>;

const wireMeta = {
	attemptId: attemptIdSchema,
	seq: seqSchema,
};

/** Stub intent. Real play intents land with `v1-table-flow`. */
export const echoIntentSchema = z.object({
	type: z.literal("echo"),
	...wireMeta,
	payload: z.unknown(),
});

export const echoFactSchema = z.object({
	type: z.literal("echo"),
	...wireMeta,
	payload: z.unknown(),
});

export const intentSchema = z.discriminatedUnion("type", [echoIntentSchema]);
export const factSchema = z.discriminatedUnion("type", [echoFactSchema]);

export type EchoIntent = z.infer<typeof echoIntentSchema>;
export type EchoFact = z.infer<typeof echoFactSchema>;
export type Intent = z.infer<typeof intentSchema>;
export type Fact = z.infer<typeof factSchema>;

export const snapshotEnvelopeSchema = z.object({
	attemptId: attemptIdSchema,
	seq: seqSchema,
	viewModel: z.unknown(),
});

export type SnapshotEnvelope = z.infer<typeof snapshotEnvelopeSchema>;

export function echoFact(intent: EchoIntent, seq: Seq): EchoFact {
	return {
		type: "echo",
		attemptId: intent.attemptId,
		seq,
		payload: intent.payload,
	};
}
