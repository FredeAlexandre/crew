import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
	testDir: "./e2e",
	fullyParallel: true,
	forbidOnly: Boolean(process.env.CI),
	retries: process.env.CI ? 2 : 0,
	use: {
		baseURL: "http://127.0.0.1:4173",
		trace: "on-first-retry",
	},
	projects: [
		{
			name: "phone-portrait",
			use: { ...devices["iPhone 12"] },
		},
		{
			name: "desktop",
			use: { ...devices["Desktop Chrome"] },
		},
	],
	webServer: {
		command: "nubx vite --port 4173 --strictPort",
		url: "http://127.0.0.1:4173",
		reuseExistingServer: !process.env.CI,
		env: {
			VITE_SERVER_URL: "http://127.0.0.1:3000",
		},
	},
});
