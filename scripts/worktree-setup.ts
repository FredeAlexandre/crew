#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const AUTH_SECRET_PLACEHOLDER = "replace-with-a-32-byte-secret";

export const LOCAL_ENV_FILES = [
	{ dest: "apps/web/.env", example: "apps/web/.env.example", fillPlaceholder: false },
	{
		dest: "apps/server/.env",
		example: "apps/server/.env.example",
		fillPlaceholder: true,
	},
] as const;

export type EnvAction = "kept" | "created" | "copied" | "secret";

export type EnvResult = {
	dest: string;
	action: EnvAction;
};

export function generateAuthSecret(): string {
	return randomBytes(32).toString("hex");
}

export function fillAuthSecret(contents: string, secret: string): string {
	return contents.replaceAll(AUTH_SECRET_PLACEHOLDER, secret);
}

function samePath(left: string, right: string): boolean {
	return resolve(left) === resolve(right);
}

function maybeFillSecret(
	contents: string,
	fillPlaceholder: boolean,
	createSecret: () => string,
): string {
	if (!fillPlaceholder || !contents.includes(AUTH_SECRET_PLACEHOLDER)) {
		return contents;
	}
	return fillAuthSecret(contents, createSecret());
}

export function ensureLocalEnvFiles(options: {
	root: string;
	primaryRoot?: string | undefined;
	createSecret?: (() => string) | undefined;
}): EnvResult[] {
	const createSecret = options.createSecret ?? generateAuthSecret;
	const primaryRoot =
		options.primaryRoot !== undefined && !samePath(options.primaryRoot, options.root)
			? options.primaryRoot
			: undefined;

	return LOCAL_ENV_FILES.map((file) => {
		const destPath = join(options.root, file.dest);
		if (existsSync(destPath)) {
			const current = readFileSync(destPath, "utf8");
			const next = maybeFillSecret(current, file.fillPlaceholder, createSecret);
			if (next === current) {
				return { dest: file.dest, action: "kept" as const };
			}
			writeFileSync(destPath, next);
			return { dest: file.dest, action: "secret" as const };
		}

		const primaryPath = primaryRoot === undefined ? undefined : join(primaryRoot, file.dest);
		if (primaryPath !== undefined && existsSync(primaryPath)) {
			writeFileSync(
				destPath,
				maybeFillSecret(readFileSync(primaryPath, "utf8"), file.fillPlaceholder, createSecret),
			);
			return { dest: file.dest, action: "copied" as const };
		}

		writeFileSync(
			destPath,
			maybeFillSecret(
				readFileSync(join(options.root, file.example), "utf8"),
				file.fillPlaceholder,
				createSecret,
			),
		);
		return { dest: file.dest, action: "created" as const };
	});
}

function nubBin(): string {
	const pinned = join(homedir(), ".nub", "bin", "nub");
	return existsSync(pinned) ? pinned : "nub";
}

export function installDependencies(root: string): number {
	const result = spawnSync(nubBin(), ["install"], {
		cwd: root,
		stdio: "inherit",
		env: process.env,
	});
	if (result.error) {
		console.error(`Failed to run nub install: ${result.error.message}`);
		return 1;
	}
	return result.status ?? 1;
}

function describeAction(result: EnvResult): string {
	switch (result.action) {
		case "kept":
			return `Kept existing ${result.dest}`;
		case "created":
			return `Wrote ${result.dest} from example`;
		case "copied":
			return `Copied ${result.dest} from the primary project`;
		case "secret":
			return `Filled BETTER_AUTH_SECRET in ${result.dest}`;
	}
}

export function setupWorktree(root: string, primaryRoot?: string): number {
	console.log("Installing dependencies…");
	const installStatus = installDependencies(root);
	if (installStatus !== 0) {
		return installStatus;
	}

	for (const result of ensureLocalEnvFiles({ root, primaryRoot })) {
		console.log(describeAction(result));
	}

	console.log("Worktree is ready. `nub run dev` starts web on :3001 and the worker on :3000.");
	return 0;
}

function isMain(): boolean {
	const entry = process.argv[1];
	if (entry === undefined) {
		return false;
	}
	return pathToFileURL(resolve(entry)).href === import.meta.url;
}

if (isMain()) {
	const root = join(dirname(fileURLToPath(import.meta.url)), "..");
	process.exitCode = setupWorktree(root, process.env.T3CODE_PROJECT_ROOT);
}
