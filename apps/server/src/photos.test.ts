import { describe, expect, it } from "vitest";
import {
	inspectPhoto,
	PHOTO_MAX_BYTES,
	parsePhotoId,
	photoIdFromStoredUrl,
	photoObjectKey,
	photoPublicUrl,
	sniffPhotoType,
} from "./photos.ts";

function jpegBytes(length = 16): Uint8Array {
	const bytes = new Uint8Array(length);
	bytes[0] = 0xff;
	bytes[1] = 0xd8;
	bytes[2] = 0xff;
	return bytes;
}

function pngBytes(): Uint8Array {
	return new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 1, 2, 3]);
}

function webpBytes(): Uint8Array {
	const bytes = new Uint8Array(16);
	bytes.set([0x52, 0x49, 0x46, 0x46], 0);
	bytes.set([0x57, 0x45, 0x42, 0x50], 8);
	return bytes;
}

describe("sniffPhotoType", () => {
	it("recognizes jpeg, png, and webp magic bytes", () => {
		expect(sniffPhotoType(jpegBytes())).toBe("image/jpeg");
		expect(sniffPhotoType(pngBytes())).toBe("image/png");
		expect(sniffPhotoType(webpBytes())).toBe("image/webp");
		expect(sniffPhotoType(new Uint8Array([0x00, 0x01, 0x02]))).toBeNull();
	});
});

describe("inspectPhoto", () => {
	it("accepts a small jpeg", () => {
		expect(inspectPhoto(jpegBytes())).toEqual({ ok: true, contentType: "image/jpeg" });
	});

	it("rejects files over the size cap", () => {
		expect(inspectPhoto(jpegBytes(PHOTO_MAX_BYTES + 1))).toEqual({
			ok: false,
			code: "tooLarge",
		});
	});

	it("accepts photos up to 5 MB", () => {
		expect(inspectPhoto(jpegBytes(PHOTO_MAX_BYTES))).toEqual({
			ok: true,
			contentType: "image/jpeg",
		});
	});

	it("rejects empty or unknown bytes", () => {
		expect(inspectPhoto(new Uint8Array())).toEqual({ ok: false, code: "unsupportedType" });
		expect(inspectPhoto(new TextEncoder().encode("<html></html>"))).toEqual({
			ok: false,
			code: "unsupportedType",
		});
	});
});

describe("photo keys and urls", () => {
	it("builds a stable object key and public url", () => {
		const id = "2f1c8a7e-4b3d-4a11-9c0e-1a2b3c4d5e6f";
		expect(photoObjectKey(id)).toBe(`avatars/${id}`);
		expect(photoPublicUrl("http://localhost:3000/", id)).toBe(`http://localhost:3000/photos/${id}`);
	});

	it("parses a stored photo url from this origin", () => {
		const id = "2f1c8a7e-4b3d-4a11-9c0e-1a2b3c4d5e6f";
		expect(parsePhotoId(id.toUpperCase())).toBe(id);
		expect(parsePhotoId("not-a-uuid")).toBeNull();
		expect(
			photoIdFromStoredUrl(`http://localhost:3000/photos/${id}`, "http://localhost:3000"),
		).toBe(id);
		expect(
			photoIdFromStoredUrl(`http://evil.example/photos/${id}`, "http://localhost:3000"),
		).toBeNull();
	});
});
