import { TASK_CATALOG } from "@crew/engine";
import { describe, expect, it } from "vitest";
import { TASK_CATALOG_PUBLIC, TASK_KIND_ORDER, tasksGroupedByKind } from "./catalog.ts";

describe("catalog", () => {
	it("re-exports every engine task", () => {
		expect(TASK_CATALOG_PUBLIC).toEqual(TASK_CATALOG);
	});

	it("groups tasks by kind without gaps or duplicates", () => {
		const groups = tasksGroupedByKind();
		const seen = new Set<string>();

		for (const group of groups) {
			expect(group.tasks.length).toBeGreaterThan(0);
			for (const task of group.tasks) {
				expect(task.kind).toBe(group.kind);
				expect(seen.has(task.id)).toBe(false);
				seen.add(task.id);
			}
		}

		expect(seen.size).toBe(TASK_CATALOG.length);
		expect(groups.map((group) => group.kind)).toEqual(
			TASK_KIND_ORDER.filter((kind) => TASK_CATALOG.some((task) => task.kind === kind)),
		);
	});
});
