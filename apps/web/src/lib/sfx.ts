type SfxCue = "place" | "tick" | "win" | "stingerWin" | "stingerFail";

const MUTE_KEY = "crew.sfx.muted";

type AudioParamLike = {
	setValueAtTime: (value: number, time: number) => void;
	linearRampToValueAtTime: (value: number, time: number) => void;
	exponentialRampToValueAtTime: (value: number, time: number) => void;
};

type OscillatorLike = {
	type: string;
	frequency: AudioParamLike;
	connect: (node: unknown) => void;
	start: (time?: number) => void;
	stop: (time?: number) => void;
};

type GainLike = {
	gain: AudioParamLike;
	connect: (node: unknown) => void;
};

type FilterLike = {
	type: string;
	frequency: AudioParamLike;
	connect: (node: unknown) => void;
};

type BufferSourceLike = {
	buffer: unknown;
	connect: (node: unknown) => void;
	start: (time?: number) => void;
	stop: (time?: number) => void;
};

type AudioBufferLike = {
	getChannelData: (channel: number) => Float32Array;
};

export type SfxBackend = {
	currentTime: number;
	sampleRate: number;
	destination: unknown;
	state?: string;
	resume?: () => Promise<void>;
	createOscillator: () => OscillatorLike;
	createGain: () => GainLike;
	createBiquadFilter: () => FilterLike;
	createBuffer: (channels: number, length: number, sampleRate: number) => AudioBufferLike;
	createBufferSource: () => BufferSourceLike;
};

let backend: SfxBackend | null = null;
let memoryMuted: boolean | null = null;
const heard = new Set<string>();
const muteListeners = new Set<() => void>();

export function isSfxMuted(): boolean {
	if (memoryMuted !== null) {
		return memoryMuted;
	}
	try {
		return globalThis.localStorage?.getItem(MUTE_KEY) === "1";
	} catch {
		return false;
	}
}

export function setSfxMuted(muted: boolean): void {
	memoryMuted = muted;
	try {
		if (muted) {
			globalThis.localStorage?.setItem(MUTE_KEY, "1");
		} else {
			globalThis.localStorage?.removeItem(MUTE_KEY);
		}
	} catch {
		// persistence is best-effort; the session flag still holds
	}
	for (const listener of muteListeners) {
		listener();
	}
}

export function subscribeSfxMute(listener: () => void): () => void {
	muteListeners.add(listener);
	return () => {
		muteListeners.delete(listener);
	};
}

export function attachSfxBackend(next: SfxBackend | null): void {
	backend = next;
}

export function resetSfxForTests(): void {
	backend = null;
	memoryMuted = null;
	heard.clear();
}

function hearOnce(key: string): boolean {
	if (heard.has(key)) {
		return false;
	}
	heard.add(key);
	return true;
}

export function unlockSfx(): void {
	const audio = getBackend();
	if (audio?.resume !== undefined && audio.state === "suspended") {
		void audio.resume();
	}
}

export function playCue(cue: SfxCue, onceKey?: string): void {
	if (isSfxMuted()) {
		return;
	}
	if (onceKey !== undefined && !hearOnce(onceKey)) {
		return;
	}
	const audio = getBackend();
	if (audio === null) {
		return;
	}
	if (audio.state === "suspended") {
		void audio.resume?.().then(() => {
			if (!isSfxMuted()) {
				startCue(cue, audio);
			}
		});
		return;
	}
	startCue(cue, audio);
}

function getBackend(): SfxBackend | null {
	if (backend !== null) {
		return backend;
	}
	const Ctor = globalThis.AudioContext;
	if (Ctor === undefined) {
		return null;
	}
	backend = new Ctor() as unknown as SfxBackend;
	return backend;
}

function startCue(cue: SfxCue, audio: SfxBackend): void {
	const now = audio.currentTime;
	switch (cue) {
		case "place":
			playPlace(audio, now);
			return;
		case "tick":
			playTone(audio, now, {
				type: "square",
				frequency: 1320,
				duration: 0.045,
				gain: 0.045,
			});
			return;
		case "win":
			playTone(audio, now, { type: "sine", frequency: 440, duration: 0.09, gain: 0.07 });
			playTone(audio, now + 0.08, { type: "sine", frequency: 659, duration: 0.11, gain: 0.07 });
			return;
		case "stingerWin":
			playTone(audio, now, { type: "sine", frequency: 392, duration: 0.12, gain: 0.08 });
			playTone(audio, now + 0.11, { type: "sine", frequency: 523, duration: 0.14, gain: 0.08 });
			playTone(audio, now + 0.24, { type: "sine", frequency: 659, duration: 0.22, gain: 0.08 });
			return;
		case "stingerFail":
			playTone(audio, now, { type: "sine", frequency: 392, duration: 0.14, gain: 0.08 });
			playTone(audio, now + 0.12, { type: "sine", frequency: 311, duration: 0.16, gain: 0.08 });
			playTone(audio, now + 0.28, { type: "sine", frequency: 247, duration: 0.26, gain: 0.07 });
	}
}

function playPlace(audio: SfxBackend, now: number): void {
	playTone(audio, now, {
		type: "triangle",
		frequency: 168,
		duration: 0.14,
		gain: 0.07,
		slideTo: 92,
	});
	const length = Math.max(1, Math.floor(audio.sampleRate * 0.08));
	const buffer = audio.createBuffer(1, length, audio.sampleRate);
	const data = buffer.getChannelData(0);
	for (let index = 0; index < data.length; index += 1) {
		data[index] = (Math.random() * 2 - 1) * (1 - index / data.length);
	}
	const source = audio.createBufferSource();
	source.buffer = buffer;
	const filter = audio.createBiquadFilter();
	filter.type = "lowpass";
	filter.frequency.setValueAtTime(720, now);
	const gain = audio.createGain();
	gain.gain.setValueAtTime(0.04, now);
	gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
	source.connect(filter);
	filter.connect(gain);
	gain.connect(audio.destination);
	source.start(now);
	source.stop(now + 0.08);
}

function playTone(
	audio: SfxBackend,
	when: number,
	spec: {
		type: string;
		frequency: number;
		duration: number;
		gain: number;
		slideTo?: number;
	},
): void {
	const oscillator = audio.createOscillator();
	const gain = audio.createGain();
	oscillator.type = spec.type;
	oscillator.frequency.setValueAtTime(spec.frequency, when);
	if (spec.slideTo !== undefined) {
		oscillator.frequency.exponentialRampToValueAtTime(
			Math.max(spec.slideTo, 0.001),
			when + spec.duration,
		);
	}
	gain.gain.setValueAtTime(spec.gain, when);
	gain.gain.exponentialRampToValueAtTime(0.001, when + spec.duration);
	oscillator.connect(gain);
	gain.connect(audio.destination);
	oscillator.start(when);
	oscillator.stop(when + spec.duration + 0.02);
}
