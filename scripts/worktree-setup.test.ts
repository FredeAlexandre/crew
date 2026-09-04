import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { AUTH_SECRET_PLACEHOLDER, ensureLocalEnvFiles, fillAuthSecret } from "./worktree-setup.ts";

const SECRET = "a".repeat(64);
const WEB_EXAMPLE = "VITE_SERVER_URL=http://localhost:3000\n";
const SERVER_EXAMPLE = [
	"BETTER_AUTH_SECRET=replace-with-a-32-byte-secret",
	"BETTER_AUTH_URL=http://localhost:3000",
	"CORS_ORIGIN=http://localhost:3001",
	"",
].join("\n");

const dirs: string[] = [];

function tempRoot(): string {
	const root = mkdtempSync(join(tmpdir(), "crew-worktree-setup-"));
	dirs.push(root);
	mkdirSync(join(root, "apps/web"), { recursive: true });
	mkdirSync(join(root, "apps/server"), { recursive: true });
	writeFileSync(join(root, "apps/web/.env.example"), WEB_EXAMPLE);
	writeFileSync(join(root, "apps/server/.env.example"), SERVER_EXAMPLE);
	return root;
}

afterEach(() => {
	for (const dir of dirs.splice(0)) {
		rmSync(dir, { recursive: true, force: true });
	}
});

describe("ensureLocalEnvFiles", () => {
	it("writes env files from examples and fills the auth secret", () => {
		const root = tempRoot();
		expect(ensureLocalEnvFiles({ root, createSecret: () => SECRET })).toEqual([
			{ dest: "apps/web/.env", action: "created" },
			{ dest: "apps/server/.env", action: "created" },
		]);
		expect(readFileSync(join(root, "apps/web/.env"), "utf8")).toBe(WEB_EXAMPLE);
		expect(readFileSync(join(root, "apps/server/.env"), "utf8")).toBe(
			fillAuthSecret(SERVER_EXAMPLE, SECRET),
		);
		expect(readFileSync(join(root, "apps/server/.env"), "utf8")).not.toContain(
			AUTH_SECRET_PLACEHOLDER,
		);
	});

	it("leaves complete env files alone on a second run", () => {
		const root = tempRoot();
		ensureLocalEnvFiles({ root, createSecret: () => SECRET });
		expect(ensureLocalEnvFiles({ root, createSecret: () => "b".repeat(64) })).toEqual([
			{ dest: "apps/web/.env", action: "kept" },
			{ dest: "apps/server/.env", action: "kept" },
		]);
		expect(readFileSync(join(root, "apps/server/.env"), "utf8")).toContain(SECRET);
	});

	it("fills a leftover placeholder without clobbering the rest of the file", () => {
		const root = tempRoot();
		writeFileSync(join(root, "apps/web/.env"), WEB_EXAMPLE);
		writeFileSync(join(root, "apps/server/.env"), SERVER_EXAMPLE);
		expect(ensureLocalEnvFiles({ root, createSecret: () => SECRET })).toEqual([
			{ dest: "apps/web/.env", action: "kept" },
			{ dest: "apps/server/.env", action: "secret" },
		]);
		expect(readFileSync(join(root, "apps/server/.env"), "utf8")).toBe(
			fillAuthSecret(SERVER_EXAMPLE, SECRET),
		);
	});

	it("copies env files from the primary project when this worktree has none", () => {
		const root = tempRoot();
		const primary = tempRoot();
		const primaryWeb = "VITE_SERVER_URL=http://localhost:4000\n";
		const primaryServer = fillAuthSecret(SERVER_EXAMPLE, "c".repeat(64));
		writeFileSync(join(primary, "apps/web/.env"), primaryWeb);
		writeFileSync(join(primary, "apps/server/.env"), primaryServer);

		expect(ensureLocalEnvFiles({ root, primaryRoot: primary, createSecret: () => SECRET })).toEqual(
			[
				{ dest: "apps/web/.env", action: "copied" },
				{ dest: "apps/server/.env", action: "copied" },
			],
		);
		expect(readFileSync(join(root, "apps/web/.env"), "utf8")).toBe(primaryWeb);
		expect(readFileSync(join(root, "apps/server/.env"), "utf8")).toBe(primaryServer);
	});

	it("does not treat the current tree as a primary source", () => {
		const root = tempRoot();
		expect(ensureLocalEnvFiles({ root, primaryRoot: root, createSecret: () => SECRET })).toEqual([
			{ dest: "apps/web/.env", action: "created" },
			{ dest: "apps/server/.env", action: "created" },
		]);
	});

	it("matches the committed server example placeholder", () => {
		const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
		expect(readFileSync(join(repoRoot, "apps/server/.env.example"), "utf8")).toContain(
			AUTH_SECRET_PLACEHOLDER,
		);
	});
});
