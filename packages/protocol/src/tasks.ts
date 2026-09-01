import { z } from "zod";
import { cardIdSchema } from "./cards.ts";
import { colorSuitSchema, suitSchema, taskIdSchema } from "./ids.ts";

export const difficultyByPlayersSchema = z.object({
	3: z.number().int().nonnegative(),
	4: z.number().int().nonnegative(),
	5: z.number().int().nonnegative(),
});

export type DifficultyByPlayers = z.infer<typeof difficultyByPlayersSchema>;

export const cardCountOpSchema = z.enum(["exact", "atLeast"]);
export type CardCountOp = z.infer<typeof cardCountOpSchema>;

export const consecutiveOpSchema = z.enum(["atLeast", "exact", "none"]);
export type ConsecutiveOp = z.infer<typeof consecutiveOpSchema>;

export const redealIfSchema = z.enum(["allSubmarines", "sub1and4or123", "sub2and4or123", "sub234"]);
export type RedealIf = z.infer<typeof redealIfSchema>;

const taskBase = {
	id: taskIdSchema,
	difficulty: difficultyByPlayersSchema,
	captainMaySelect: z.boolean(),
	redealIf: redealIfSchema.optional(),
};

const colorCountPartSchema = z.object({
	suit: colorSuitSchema,
	count: z.number().int().nonnegative(),
	op: cardCountOpSchema,
});

export const taskPublicSchema = z.discriminatedUnion("kind", [
	z.object({
		...taskBase,
		kind: z.literal("winCards"),
		cards: z.array(cardIdSchema).min(1),
		/** 1-based trick index; 0 means the last trick of the attempt. */
		inTrick: z.number().int().min(0).optional(),
	}),
	z.object({
		...taskBase,
		kind: z.literal("winColor"),
		suit: colorSuitSchema,
		count: z.number().int().nonnegative(),
		op: cardCountOpSchema.optional(),
	}),
	z.object({
		...taskBase,
		kind: z.literal("winColors"),
		parts: z.array(colorCountPartSchema).min(1),
	}),
	z.object({
		...taskBase,
		kind: z.literal("winValue"),
		value: z.number().int().min(1).max(9),
		count: z.number().int().positive(),
		op: cardCountOpSchema.optional(),
	}),
	z.object({
		...taskBase,
		kind: z.literal("winSubmarines"),
		count: z.number().int().positive(),
		op: cardCountOpSchema.optional(),
		onlyCard: cardIdSchema.optional(),
	}),
	z.object({
		...taskBase,
		kind: z.literal("winWith"),
		card: cardIdSchema.optional(),
		suit: suitSchema.optional(),
		value: z.number().int().min(1).max(9).optional(),
		captureCard: cardIdSchema.optional(),
		captureValue: z.number().int().min(1).max(9).optional(),
	}),
	z.object({
		...taskBase,
		kind: z.literal("avoid"),
		cards: z.array(cardIdSchema).optional(),
		suit: colorSuitSchema.optional(),
		suits: z.array(colorSuitSchema).optional(),
		value: z.number().int().min(1).max(9).optional(),
		values: z.array(z.number().int().min(1).max(9)).optional(),
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
		op: consecutiveOpSchema.optional(),
	}),
	z.object({
		...taskBase,
		kind: z.literal("nthTrick"),
		/** 1-based trick index; 0 means the last trick of the attempt. */
		n: z.number().int().min(0),
		count: z.number().int().positive().optional(),
		alsoLast: z.boolean().optional(),
		only: z.boolean().optional(),
	}),
	z.object({
		...taskBase,
		kind: z.literal("skipFirstTricks"),
		count: z.number().int().positive(),
	}),
	z.object({
		...taskBase,
		kind: z.literal("compareTricks"),
		op: z.enum(["moreThan", "fewerThan", "equalTo"]),
		vs: z.enum(["captain", "eachOther", "othersCombined"]),
	}),
	z.object({
		...taskBase,
		kind: z.literal("trickSum"),
		op: z.enum(["gt", "lt", "eq"]),
		target: z.union([z.number().int(), difficultyByPlayersSchema]).optional(),
		targets: z.array(z.number().int()).min(1).optional(),
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
	z.object({
		...taskBase,
		kind: z.literal("collectEqualColor"),
		a: colorSuitSchema,
		b: colorSuitSchema,
		inTrick: z.boolean(),
	}),
	z.object({
		...taskBase,
		kind: z.literal("noLead"),
		suits: z.array(colorSuitSchema).min(1),
	}),
	z.object({
		...taskBase,
		kind: z.literal("predictTricks"),
		reveal: z.enum(["open", "hidden"]),
	}),
]);

export type TaskPublic = z.infer<typeof taskPublicSchema>;
