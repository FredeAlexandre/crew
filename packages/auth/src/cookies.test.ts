import { describe, expect, it } from "vitest";
import { sessionCookieAttributes } from "./cookies.ts";

describe("sessionCookieAttributes", () => {
	it("uses partitioned cross-site cookies on HTTPS", () => {
		expect(sessionCookieAttributes("https://crew.aleno.casa")).toEqual({
			sameSite: "none",
			secure: true,
			httpOnly: true,
			partitioned: true,
		});
	});

	it("uses first-party cookies on local HTTP so the browser will store them", () => {
		expect(sessionCookieAttributes("http://localhost:3000")).toEqual({
			sameSite: "lax",
			secure: false,
			httpOnly: true,
		});
	});
});
