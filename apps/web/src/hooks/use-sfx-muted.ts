import { useCallback, useSyncExternalStore } from "react";
import { isSfxMuted, setSfxMuted, subscribeSfxMute } from "../lib/sfx.ts";

export function useSfxMuted(): [boolean, (muted: boolean) => void] {
	const muted = useSyncExternalStore(subscribeSfxMute, isSfxMuted, () => false);
	const setMuted = useCallback((next: boolean) => {
		setSfxMuted(next);
	}, []);
	return [muted, setMuted];
}
