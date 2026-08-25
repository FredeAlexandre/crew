const MIN_BOT_PLAY_DELAY_MS = 500;
const MAX_BOT_PLAY_DELAY_MS = 2_500;

export function botPlayDelayMs(random = Math.random): number {
	return (
		MIN_BOT_PLAY_DELAY_MS +
		Math.floor(random() * (MAX_BOT_PLAY_DELAY_MS - MIN_BOT_PLAY_DELAY_MS + 1))
	);
}
