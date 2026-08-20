/** Seeded mulberry32. State is a uint32 stored on EngineState. */

export type Rng = {
	state: number;
};

export function createRng(seed: number): Rng {
	return { state: seed >>> 0 };
}

function nextUnit(rng: Rng): number {
	rng.state = (rng.state + 0x6d2b79f5) >>> 0;
	let t = rng.state;
	t = Math.imul(t ^ (t >>> 15), t | 1);
	t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
	return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function nextInt(rng: Rng, maxExclusive: number): number {
	if (maxExclusive <= 0) {
		return 0;
	}
	return Math.floor(nextUnit(rng) * maxExclusive);
}

export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
	const next = [...items];
	for (let i = next.length - 1; i > 0; i -= 1) {
		const j = nextInt(rng, i + 1);
		const a = next[i];
		const b = next[j];
		if (a === undefined || b === undefined) {
			continue;
		}
		next[i] = b;
		next[j] = a;
	}
	return next;
}
