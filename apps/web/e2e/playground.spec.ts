import { expect, test } from "@playwright/test";

test("playground renders the hello fixture", async ({ page }) => {
	test.skip(
		!process.env.PLAYWRIGHT_WEB,
		"Stub until scene fixtures exist; set PLAYWRIGHT_WEB=1 to run against a live Vite server.",
	);
	await page.goto("/playground");
	await expect(page.getByRole("heading", { name: "Playground" })).toBeVisible();
	await expect(page.getByText("hello")).toBeVisible();
});
