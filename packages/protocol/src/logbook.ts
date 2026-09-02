import { z } from "zod";

export const logbookStepSchema = z.object({
	id: z.string(),
	difficulty: z.number().int().positive(),
	storyKeys: z.array(z.string()),
	challengeKey: z.string(),
});

export type LogbookStep = z.infer<typeof logbookStepSchema>;

export const logbookSchema = z.object({
	id: z.string(),
	titleKey: z.string(),
	steps: z.array(logbookStepSchema),
	epilogueStoryKeys: z.array(z.string()).optional(),
});

export type Logbook = z.infer<typeof logbookSchema>;

export const DEEP_SEA_LOGBOOK: Logbook = {
	id: "deep-sea",
	titleKey: "logbook.deepSea.title",
	steps: [
		{
			id: "deep-sea-1",
			difficulty: 1,
			storyKeys: ["logbook.deepSea.m1.p1", "logbook.deepSea.m1.p2"],
			challengeKey: "logbook.deepSea.m1.challenge",
		},
		{
			id: "deep-sea-2",
			difficulty: 2,
			storyKeys: ["logbook.deepSea.m2.p1"],
			challengeKey: "logbook.deepSea.m2.challenge",
		},
		{
			id: "deep-sea-3",
			difficulty: 3,
			storyKeys: ["logbook.deepSea.m3.p1"],
			challengeKey: "logbook.deepSea.m3.challenge",
		},
		{
			id: "deep-sea-4",
			difficulty: 4,
			storyKeys: ["logbook.deepSea.m4.p1"],
			challengeKey: "logbook.deepSea.m4.challenge",
		},
		{
			id: "deep-sea-5",
			difficulty: 5,
			storyKeys: ["logbook.deepSea.m5.p1"],
			challengeKey: "logbook.deepSea.m5.challenge",
		},
	],
	epilogueStoryKeys: ["logbook.deepSea.epilogue.p1"],
};

export const LOGBOOKS: Record<string, Logbook> = {
	"deep-sea": DEEP_SEA_LOGBOOK,
};

export function getLogbook(id: string): Logbook | undefined {
	return LOGBOOKS[id];
}
