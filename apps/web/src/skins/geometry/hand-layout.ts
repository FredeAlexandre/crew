/** Topmost card whose displayed rect contains the point. A raised card wins if it still covers the point. */
export function cardIndexFromRects(
	x: number,
	y: number,
	rects: readonly { left: number; right: number; top: number; bottom: number }[],
	raisedIndex: number | null,
): number | null {
	if (raisedIndex !== null) {
		const raised = rects[raisedIndex];
		if (raised && x >= raised.left && x <= raised.right && y >= raised.top && y <= raised.bottom) {
			return raisedIndex;
		}
	}
	for (let index = rects.length - 1; index >= 0; index -= 1) {
		const rect = rects[index];
		if (rect && x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
			return index;
		}
	}
	return null;
}
