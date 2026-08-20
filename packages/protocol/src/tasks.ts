import { z } from "zod";
import { cardIdSchema } from "./cards.ts";
import { colorSuitSchema, suitSchema, taskIdSchema } from "./ids.ts";

export const difficultyByPlayersSchema = z.object({
	3: z.number().int().nonnegative(),
	4: z.number().int().nonnegative(),
	5: z.number().int().nonnegative(),
});

export type DifficultyByPlayers = z.infer<typeof difficultyByPlayersSchema>;

const taskBase = {
	id: taskIdSchema,
	difficulty: difficultyByPlayersSchema,
	captainMaySelect: z.boolean(),
};

export const taskPublicSchema = z.discriminatedUnion("kind", [
	z.object({
		...taskBase,
		kind: z.literal("winCards"),
		cards: z.array(cardIdSchema).min(1),
	}),
	z.object({
		...taskBase,
		kind: z.literal("winColor"),
		suit: colorSuitSchema,
		count: z.number().int().positive(),
	}),
	z.object({
		...taskBase,
		kind: z.literal("winValue"),
		value: z.number().int().min(1).max(9),
		count: z.number().int().positive(),
	}),
	z.object({
		...taskBase,
		kind: z.literal("winSubmarines"),
		count: z.number().int().positive(),
	}),
	z.object({
		...taskBase,
		kind: z.literal("winWith"),
		card: cardIdSchema.optional(),
		suit: suitSchema.optional(),
		value: z.number().int().min(1).max(9).optional(),
	}),
	z.object({
		...taskBase,
		kind: z.literal("avoid"),
		cards: z.array(cardIdSchema).optional(),
		suit: colorSuitSchema.optional(),
		value: z.number().int().min(1).max(9).optional(),
		submarines: z.boolean().optional(),
	}),
	z.object({
		...taskBase,
		kind: z.literal("trickCount"),
		op: z.enum(["exact", "atLeast", "atMost"]),
		count: z.number().int().nonnegative(),
	}),
	z.object({
		...taskBase,
		kind: z.literal("consecutiveTricks"),
		count: z.number().int().positive(),
	}),
	z.object({
		...taskBase,
		kind: z.literal("nthTrick"),
		/** 1-based trick index; 0 means the last trick of the attempt. */
		n: z.number().int().min(0),
	}),
	z.object({
		...taskBase,
		kind: z.literal("compareTricks"),
		op: z.enum(["moreThan", "fewerThan", "equalTo"]),
		vs: z.enum(["captain", "eachOther"]),
	}),
	z.object({
		...taskBase,
		kind: z.literal("trickSum"),
		op: z.enum(["gt", "lt", "eq"]),
		target: z.number().int(),
		noSubmarines: z.boolean(),
	}),
	z.object({
		...taskBase,
		kind: z.literal("trickFilter"),
		filter: z.enum(["allGt", "allLt", "allOdd", "allEven"]),
		bound: z.number().int().optional(),
		noSubmarines: z.boolean(),
	}),
	z.object({
		...taskBase,
		kind: z.literal("collectAllColors"),
	}),
	z.object({
		...taskBase,
		kind: z.literal("collectAllOfOneColor"),
	}),
	z.object({
		...taskBase,
		kind: z.literal("collectMoreColor"),
		more: colorSuitSchema,
		less: colorSuitSchema,
	}),
]);

export type TaskPublic = z.infer<typeof taskPublicSchema>;
