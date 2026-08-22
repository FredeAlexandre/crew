import { expect, test } from "@playwright/test";

test("home offers create and join", async ({ page }) => {
	test.skip(
		!process.env.PLAYWRIGHT_WEB,
		"Stub until a live Vite server is running; set PLAYWRIGHT_WEB=1 to run.",
	);
	await page.goto("/");
	await expect(page.getByRole("heading", { name: "Crew" })).toBeVisible();
	await expect(page.getByRole("textbox", { name: "Name" })).toBeVisible();
	await expect(page.getByRole("heading", { name: "Create a lobby" })).toBeVisible();
	await expect(page.getByRole("heading", { name: "Join a lobby" })).toBeVisible();
});
