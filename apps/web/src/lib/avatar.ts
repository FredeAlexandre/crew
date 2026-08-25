const DICEBEAR_BOTTTS_URL = "https://api.dicebear.com/10.x/bottts/svg";

/**
 * DiceBear's Bottts collection uses a seeded pseudo-random generator, so the
 * same durable player id always produces the same playful bot avatar.
 */
export function identiconUrl(seed: string): string {
	const url = new URL(DICEBEAR_BOTTTS_URL);
	url.searchParams.set("seed", seed);
	return url.toString();
}
