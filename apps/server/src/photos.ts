export const PHOTO_MAX_BYTES = 5 * 1024 * 1024;

const PHOTO_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type PhotoContentType = "image/jpeg" | "image/png" | "image/webp";

type PhotoInspectResult =
	| { ok: true; contentType: PhotoContentType }
	| { ok: false; code: "tooLarge" | "unsupportedType" };

export function photoObjectKey(id: string): string {
	return `avatars/${id}`;
}

export function parsePhotoId(raw: string): string | null {
	if (!PHOTO_ID_PATTERN.test(raw)) {
		return null;
	}
	return raw.toLowerCase();
}

export function photoPublicUrl(origin: string, id: string): string {
	return `${origin.replace(/\/$/, "")}/photos/${id}`;
}

export function photoIdFromStoredUrl(stored: string, origin: string): string | null {
	try {
		const url = new URL(stored);
		const expected = new URL(origin);
		if (url.origin !== expected.origin) {
			return null;
		}
		const match = /^\/photos\/([^/]+)$/.exec(url.pathname);
		const id = match?.[1];
		if (id === undefined) {
			return null;
		}
		return parsePhotoId(id);
	} catch {
		return null;
	}
}

export function inspectPhoto(bytes: Uint8Array): PhotoInspectResult {
	if (bytes.byteLength > PHOTO_MAX_BYTES) {
		return { ok: false, code: "tooLarge" };
	}
	const contentType = sniffPhotoType(bytes);
	if (contentType === null) {
		return { ok: false, code: "unsupportedType" };
	}
	return { ok: true, contentType };
}

export function sniffPhotoType(bytes: Uint8Array): PhotoContentType | null {
	if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
		return "image/jpeg";
	}
	if (
		bytes.length >= 8 &&
		bytes[0] === 0x89 &&
		bytes[1] === 0x50 &&
		bytes[2] === 0x4e &&
		bytes[3] === 0x47 &&
		bytes[4] === 0x0d &&
		bytes[5] === 0x0a &&
		bytes[6] === 0x1a &&
		bytes[7] === 0x0a
	) {
		return "image/png";
	}
	if (
		bytes.length >= 12 &&
		bytes[0] === 0x52 &&
		bytes[1] === 0x49 &&
		bytes[2] === 0x46 &&
		bytes[3] === 0x46 &&
		bytes[8] === 0x57 &&
		bytes[9] === 0x45 &&
		bytes[10] === 0x42 &&
		bytes[11] === 0x50
	) {
		return "image/webp";
	}
	return null;
}
