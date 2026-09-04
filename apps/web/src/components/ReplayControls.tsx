import { REPLAY_SPEEDS, type ReplayCheckpoint, type ReplaySpeed } from "@crew/view-model/replay";
import { Link } from "@tanstack/react-router";
import { PauseIcon, PlayIcon } from "lucide-react";
import { type KeyboardEvent, type PointerEvent, useRef } from "react";
import { useI18n } from "../lib/i18n.tsx";
import styles from "./replay-controls.module.css";
import { Button } from "./ui/button.tsx";

type ReplayControlsProps = {
	totalMs: number;
	timeMs: number;
	playing: boolean;
	speed: ReplaySpeed;
	checkpoints: readonly ReplayCheckpoint[];
	onSeek: (ms: number) => void;
	onTogglePlay: () => void;
	onSpeed: (speed: ReplaySpeed) => void;
};

export function ReplayControls({
	totalMs,
	timeMs,
	playing,
	speed,
	checkpoints,
	onSeek,
	onTogglePlay,
	onSpeed,
}: ReplayControlsProps) {
	const { t } = useI18n();
	const trackRef = useRef<HTMLDivElement>(null);
	const progress = totalMs <= 0 ? 0 : Math.min(1, timeMs / totalMs);

	function pointerSeek(event: PointerEvent<HTMLDivElement>) {
		const track = trackRef.current;
		if (track === null || totalMs <= 0) {
			return;
		}
		const rect = track.getBoundingClientRect();
		const ratio = rect.width <= 0 ? 0 : (event.clientX - rect.left) / rect.width;
		onSeek(Math.min(1, Math.max(0, ratio)) * totalMs);
	}

	function onTrackKey(event: KeyboardEvent<HTMLDivElement>) {
		if (totalMs <= 0) {
			return;
		}
		const step = totalMs * 0.04;
		if (event.key === "ArrowRight" || event.key === "ArrowUp") {
			event.preventDefault();
			onSeek(timeMs + step);
		}
		if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
			event.preventDefault();
			onSeek(timeMs - step);
		}
		if (event.key === "Home") {
			event.preventDefault();
			onSeek(0);
		}
		if (event.key === "End") {
			event.preventDefault();
			onSeek(totalMs);
		}
	}

	return (
		<div className={styles.hud}>
			<div className={styles.top}>
				<Link className={styles.back} to="/history">
					{t("back")}
				</Link>
				<div className={styles.actions}>
					<Button
						variant="outline"
						size="icon-sm"
						aria-label={playing ? t("replayPause") : t("replayPlay")}
						onPress={onTogglePlay}
					>
						{playing ? <PauseIcon /> : <PlayIcon />}
					</Button>
					<fieldset className={styles.speeds}>
						<legend className="sr-only">{t("replaySpeed")}</legend>
						{REPLAY_SPEEDS.map((rate) => (
							<Button
								key={rate}
								size="xs"
								variant={speed === rate ? "default" : "outline"}
								aria-pressed={speed === rate}
								onPress={() => onSpeed(rate)}
							>
								{t("replaySpeedRate", { rate: formatSpeed(rate) })}
							</Button>
						))}
					</fieldset>
				</div>
			</div>
			<div
				ref={trackRef}
				className={styles.track}
				role="slider"
				tabIndex={0}
				aria-label={t("replayTimeline")}
				aria-valuemin={0}
				aria-valuemax={Math.round(totalMs)}
				aria-valuenow={Math.round(timeMs)}
				onPointerDown={pointerSeek}
				onKeyDown={onTrackKey}
			>
				<span className={styles.fill} style={{ width: `${progress * 100}%` }} />
				{checkpoints.map((mark, index) => (
					<button
						key={`${mark.kind}-${mark.taskInstanceId ?? mark.trickId ?? index}`}
						type="button"
						className={styles.mark}
						data-kind={mark.kind}
						data-hue={mark.kind === "task" ? String((mark.colorIndex ?? 0) % 8) : undefined}
						style={{ left: `${totalMs <= 0 ? 0 : (mark.atMs / totalMs) * 100}%` }}
						aria-label={
							mark.kind === "round"
								? t("replayRound", { number: mark.trickId ?? index + 1 })
								: t("replayTask", { number: (mark.colorIndex ?? 0) + 1 })
						}
						onPointerDown={(event) => event.stopPropagation()}
						onClick={(event) => {
							event.stopPropagation();
							onSeek(mark.atMs);
						}}
					/>
				))}
				<span className={styles.thumb} style={{ left: `${progress * 100}%` }} />
			</div>
		</div>
	);
}

function formatSpeed(rate: ReplaySpeed): string {
	return rate === 1 ? "1" : String(rate);
}
