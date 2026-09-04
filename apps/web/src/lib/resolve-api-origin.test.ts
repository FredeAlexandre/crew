import { describe, expect, it } from "vitest";
import { resolveApiOrigin } from "./resolve-api-origin.ts";

describe("resolveApiOrigin", () => {
	it("uses the page origin in local Vite so auth cookies stay first-party", () => {
		expect(
			resolveApiOrigin({
				dev: true,
				pageOrigin: "http://localhost:3001/",
				serverUrl: "http://localhost:3000",
			}),
		).toBe("http://localhost:3001");
	});

	it("uses the worker URL in production", () => {
		expect(
			resolveApiOrigin({
				dev: false,
				pageOrigin: "https://crew.aleno.casa",
				serverUrl: "https://api.example.workers.dev",
			}),
		).toBe("https://api.example.workers.dev");
	});

	it("falls back to the worker URL when there is no page", () => {
		expect(
			resolveApiOrigin({
				dev: true,
				pageOrigin: undefined,
				serverUrl: "http://localhost:3000",
			}),
		).toBe("http://localhost:3000");
	});
});
