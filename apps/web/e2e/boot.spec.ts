import { expect, test } from "@playwright/test";

test("home offers play and join", async ({ page }) => {
	test.skip(
		!process.env.PLAYWRIGHT_WEB,
		"Stub until a live Vite server is running; set PLAYWRIGHT_WEB=1 to run.",
	);
	await page.addInitScript(() => {
		localStorage.setItem("crew.locale", "en");
	});
	await page.goto("/");
	await expect(page.getByRole("heading", { name: "Crew" })).toBeVisible();
	await expect(page.getByRole("button", { name: /profile/i })).toBeVisible();
	await expect(page.getByRole("button", { name: "Language" })).toBeVisible();
	await expect(page.getByRole("button", { name: "Play" })).toBeVisible();
	await expect(page.getByRole("button", { name: "Join" })).toBeVisible();
	await expect(page.getByRole("textbox", { name: "Name" })).toHaveCount(0);
});
