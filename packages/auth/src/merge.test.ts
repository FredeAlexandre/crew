import { describe, expect, it } from "vitest";
import {
	guestHasMergeableData,
	isChosenDisplayName,
	pickMergedImage,
	pickMergedName,
} from "./merge.ts";

describe("isChosenDisplayName", () => {
	it("rejects generated guest names and blanks", () => {
		expect(isChosenDisplayName("Guest a1b2c3d4")).toBe(false);
		expect(isChosenDisplayName("   ")).toBe(false);
		expect(isChosenDisplayName("Alex")).toBe(true);
	});
});

describe("pickMergedName", () => {
	it("keeps the real account name when it was chosen", () => {
		expect(pickMergedName("Sam", "Alex")).toBe("Alex");
	});

	it("takes the guest name when the real account still has a generated name", () => {
		expect(pickMergedName("Sam", "Guest ab12cd34")).toBe("Sam");
	});
});

describe("pickMergedImage", () => {
	it("keeps the real photo, else takes the guest photo", () => {
		expect(pickMergedImage("guest.png", "real.png")).toBe("real.png");
		expect(pickMergedImage("guest.png", null)).toBe("guest.png");
		expect(pickMergedImage(null, null)).toBe(null);
	});
});

describe("guestHasMergeableData", () => {
	it("is true when the guest chose a name, photo, or hosted a table", () => {
		expect(
			guestHasMergeableData({ guestName: "Guest a1b2c3d4", guestImage: null, hostedRoomCount: 0 }),
		).toBe(false);
		expect(guestHasMergeableData({ guestName: "Alex", guestImage: null, hostedRoomCount: 0 })).toBe(
			true,
		);
		expect(
			guestHasMergeableData({ guestName: "Guest a1b2c3d4", guestImage: "x", hostedRoomCount: 0 }),
		).toBe(true);
		expect(
			guestHasMergeableData({ guestName: "Guest a1b2c3d4", guestImage: null, hostedRoomCount: 1 }),
		).toBe(true);
	});
});
