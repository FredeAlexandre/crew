export const DISPLAY_NAME_MAX = 24;
export const DISPLAY_NAME_DEBOUNCE_MS = 500;

const GENERATED_GUEST_NAME = /^Guest [0-9a-f]{8}$/i;

export function normalizeDisplayName(raw: string): string {
	return raw.trim().replace(/\s+/g, " ").slice(0, DISPLAY_NAME_MAX);
}

export function isGeneratedGuestName(name: string): boolean {
	return GENERATED_GUEST_NAME.test(name);
}

export function visibleDisplayName(stored: string): string {
	return isGeneratedGuestName(stored) ? "" : stored;
}

export function createDebouncedAction(
	action: (value: string) => Promise<void>,
	delayMs: number,
): {
	schedule: (value: string) => void;
	flush: (value: string) => Promise<void>;
	cancel: () => void;
} {
	let timer: ReturnType<typeof setTimeout> | null = null;
	let chain: Promise<void> = Promise.resolve();

	function run(value: string): Promise<void> {
		const next = chain.then(() => action(value)).catch(() => undefined);
		chain = next;
		return next;
	}

	return {
		schedule(value: string) {
			if (timer !== null) {
				clearTimeout(timer);
			}
			timer = setTimeout(() => {
				timer = null;
				void run(value);
			}, delayMs);
		},
		async flush(value: string) {
			if (timer !== null) {
				clearTimeout(timer);
				timer = null;
			}
			await run(value);
		},
		cancel() {
			if (timer !== null) {
				clearTimeout(timer);
				timer = null;
			}
		},
	};
}
