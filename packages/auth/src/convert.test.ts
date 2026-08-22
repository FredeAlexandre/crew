import { describe, expect, it } from "vitest";
import { convertErrorMessage, parseConvertInput } from "./convert.ts";

describe("parseConvertInput", () => {
	it("normalizes email and accepts a long enough password", () => {
		expect(parseConvertInput({ email: "  Alex@Example.COM ", password: "secretword" })).toEqual({
			ok: true,
			email: "alex@example.com",
			password: "secretword",
		});
	});

	it("rejects missing or malformed email", () => {
		expect(parseConvertInput({})).toEqual({ ok: false, code: "invalidEmail" });
		expect(parseConvertInput({ email: "alex", password: "secretword" })).toEqual({
			ok: false,
			code: "invalidEmail",
		});
	});

	it("rejects short and long passwords", () => {
		expect(parseConvertInput({ email: "a@b.co", password: "short" })).toEqual({
			ok: false,
			code: "passwordTooShort",
		});
		expect(parseConvertInput({ email: "a@b.co", password: "x".repeat(129) })).toEqual({
			ok: false,
			code: "passwordTooLong",
		});
	});
});

describe("convertErrorMessage", () => {
	it("explains each parse failure", () => {
		expect(convertErrorMessage("invalidEmail")).toMatch(/email/i);
		expect(convertErrorMessage("passwordTooShort")).toMatch(/8/);
		expect(convertErrorMessage("passwordTooLong")).toMatch(/128/);
	});
});
