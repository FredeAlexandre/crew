/** @type {import("dependency-cruiser").IConfiguration} */
export default {
	forbidden: [
		{
			name: "web-no-engine",
			comment: "apps/web must not import packages/engine (directly or via project).",
			severity: "error",
			from: { path: "^apps/web" },
			to: { path: "^packages/engine" },
		},
		{
			name: "web-no-view-model-project",
			comment: "Skin binds to fixture JSON only; projection stays on the server.",
			severity: "error",
			from: { path: "^apps/web" },
			to: { path: "^packages/view-model/src/project\\.ts" },
		},
		{
			name: "web-no-db",
			comment: "The SPA does not talk to Drizzle or D1.",
			severity: "error",
			from: { path: "^apps/web" },
			to: { path: "^packages/db" },
		},
		{
			name: "web-no-auth-server",
			comment: "Better Auth server config is not a browser package.",
			severity: "error",
			from: { path: "^apps/web" },
			to: { path: "^packages/auth" },
		},
		{
			name: "engine-purity",
			comment: "Engine depends on protocol only — no DOM, db, auth, or view-model.",
			severity: "error",
			from: { path: "^packages/engine" },
			to: {
				path: "^(packages/(db|auth|view-model|env|infra)|apps/)",
			},
		},
		{
			name: "no-circular",
			severity: "error",
			from: {},
			to: { circular: true },
		},
	],
	options: {
		doNotFollow: {
			path: "node_modules",
		},
		tsPreCompilationDeps: true,
		enhancedResolveOptions: {
			exportsFields: ["exports"],
			conditionNames: ["import", "require", "node", "default", "types"],
		},
	},
};
