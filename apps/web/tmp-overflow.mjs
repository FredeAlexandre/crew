import { chromium } from "@playwright/test";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 360, height: 640 }, hasTouch: true });
await page.goto("http://127.0.0.1:3001/tmp-play.html", { waitUntil: "networkidle" });
await page.waitForTimeout(400);
const hand = page.locator("[data-region='hand']");
await hand.waitFor();
const box = await hand.boundingBox();
const paint = await page.evaluate(() => {
	const card = document.querySelector("[data-region='hand'] [data-suit]");
	const cs = getComputedStyle(card);
	const r = card.getBoundingClientRect();
	return { bg: cs.backgroundColor, w: r.width, h: r.height };
});
await page.screenshot({ path: "/tmp/crew-cards.png" });
if (box) {
	await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.55);
	await page.mouse.down();
	await page.waitForTimeout(220);
	await page.screenshot({ path: "/tmp/crew-cards-peek.png" });
	await page.mouse.up();
}
console.log(JSON.stringify({ paint, overflow: await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth })) }, null, 2));
await browser.close();
