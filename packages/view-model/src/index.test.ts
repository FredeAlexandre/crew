import { describe, expect, it } from "vitest";
import { helloFixture } from "./fixtures/hello.ts";
import { project } from "./project.ts";

describe("hello fixture", () => {
	it("names the table region", () => {
		expect(helloFixture.regions).toEqual(["table"]);
	});
});

describe("project", () => {
	it("returns the hello fixture until view-model lands", () => {
		expect(project({ version: 0 }, 0)).toEqual(helloFixture);
	});
});
