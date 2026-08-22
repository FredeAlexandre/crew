function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

/** Total fan sweep in degrees. Shallow enough for a phone, open enough that top corners peek. */
export function fanSpread(count: number): number {
	if (count <= 1) {
		return 0;
	}
	return Math.min(56, Math.max(18, 5.2 * (count - 1)));
}

export function fanAngle(index: number, count: number, spreadDeg: number): number {
	if (count <= 1) {
		return 0;
	}
	return (index / (count - 1) - 0.5) * spreadDeg;
}

/** Lift the middle of the fan so the hand reads as an arc, not a row. */
export function fanRise(index: number, count: number, depth = 16): number {
	if (count <= 1) {
		return 0;
	}
	const t = index / (count - 1) - 0.5;
	return -depth * (1 - 4 * t * t);
}
/** Horizontal shift so cards sit along the arc instead of sharing one pivot. */
export function fanShift(index: number, count: number, width: number, cardWidth: number): number {
	if (count <= 1) {
		return 0;
	}
	const usable = Math.max(0, width - cardWidth) * 0.84;
	return (index / (count - 1) - 0.5) * usable;
}

/**
 * Map a pointer X inside the fan to a card index.
 * Pass `current` after the first peek so the card does not flicker on the slot boundary.
 */
export function nearestFanIndex(x: number, width: number, count: number, current?: number): number {
	if (count <= 1) {
		return 0;
	}
	const t = width <= 0 ? 0.5 : clamp(x / width, 0, 1);
	const raw = t * (count - 1);
	const nearest = Math.round(raw);
	if (current !== undefined && Math.abs(raw - current) < 0.62) {
		return clamp(current, 0, count - 1);
	}
	return clamp(nearest, 0, count - 1);
}
