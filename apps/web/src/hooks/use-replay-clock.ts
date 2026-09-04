import type { ReplaySpeed } from "@crew/view-model/replay";
import { useCallback, useEffect, useRef, useState } from "react";

export function useReplayClock(totalMs: number, startPlaying = true) {
	const [playing, setPlaying] = useState(startPlaying);
	const [speed, setSpeed] = useState<ReplaySpeed>(1);
	const [timeMs, setTimeMs] = useState(0);
	const timeRef = useRef(0);
	timeRef.current = timeMs;

	useEffect(() => {
		if (!playing || totalMs <= 0) {
			return;
		}
		let last = performance.now();
		let frame = 0;
		function tick(now: number) {
			const delta = (now - last) * speed;
			last = now;
			const next = Math.min(totalMs, timeRef.current + delta);
			timeRef.current = next;
			setTimeMs(next);
			if (next >= totalMs) {
				setPlaying(false);
				return;
			}
			frame = window.requestAnimationFrame(tick);
		}
		frame = window.requestAnimationFrame(tick);
		return () => window.cancelAnimationFrame(frame);
	}, [playing, speed, totalMs]);

	const seek = useCallback(
		(ms: number) => {
			const next = Math.min(totalMs, Math.max(0, ms));
			timeRef.current = next;
			setTimeMs(next);
		},
		[totalMs],
	);

	const togglePlay = useCallback(() => {
		setPlaying((current) => {
			if (!current && timeRef.current >= totalMs && totalMs > 0) {
				timeRef.current = 0;
				setTimeMs(0);
			}
			return !current;
		});
	}, [totalMs]);

	return { playing, speed, timeMs, seek, togglePlay, setSpeed, setPlaying };
}
