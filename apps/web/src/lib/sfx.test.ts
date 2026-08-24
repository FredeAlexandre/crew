import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	attachSfxBackend,
	isSfxMuted,
	playCue,
	resetSfxForTests,
	type SfxBackend,
	setSfxMuted,
} from "./sfx.ts";

type ToneCall = { type: string; frequency: number };

function param() {
	return {
		setValueAtTime: () => undefined,
		linearRampToValueAtTime: () => undefined,
		exponentialRampToValueAtTime: () => undefined,
	};
}

function fakeBackend(): { audio: SfxBackend; tones: ToneCall[] } {
	const tones: ToneCall[] = [];
	const audio: SfxBackend = {
		currentTime: 0,
		sampleRate: 48000,
		destination: {},
		state: "running",
		createOscillator() {
			const tone: ToneCall = { type: "sine", frequency: 0 };
			const node = {
				type: "sine",
				frequency: {
					setValueAtTime: (value: number) => {
						if (tone.frequency === 0) {
							tone.frequency = value;
						}
					},
					linearRampToValueAtTime: () => undefined,
					exponentialRampToValueAtTime: () => undefined,
				},
				connect: () => undefined,
				start: () => undefined,
				stop: () => undefined,
			};
			Object.defineProperty(node, "type", {
				get: () => tone.type,
				set: (value: string) => {
					tone.type = value;
				},
			});
			tones.push(tone);
			return node;
		},
		createGain() {
			return { gain: param(), connect: () => undefined };
		},
		createBiquadFilter() {
			return { type: "lowpass", frequency: param(), connect: () => undefined };
		},
		createBuffer(_channels: number, length: number) {
			return { getChannelData: () => new Float32Array(length) };
		},
		createBufferSource() {
			return {
				buffer: null,
				connect: () => undefined,
				start: () => undefined,
				stop: () => undefined,
			};
		},
	};
	return { audio, tones };
}

const store = new Map<string, string>();

beforeEach(() => {
	store.clear();
	Object.defineProperty(globalThis, "localStorage", {
		configurable: true,
		value: {
			getItem: (key: string) => store.get(key) ?? null,
			setItem: (key: string, value: string) => {
				store.set(key, value);
			},
			removeItem: (key: string) => {
				store.delete(key);
			},
		},
	});
	resetSfxForTests();
});

afterEach(() => {
	resetSfxForTests();
});

describe("sfx mute", () => {
	it("defaults to sound on", () => {
		expect(isSfxMuted()).toBe(false);
	});

	it("persists mute and stays muted after a reset", () => {
		const fake = fakeBackend();
		attachSfxBackend(fake.audio);
		setSfxMuted(true);
		expect(store.get("crew.sfx.muted")).toBe("1");
		playCue("place");
		expect(fake.tones).toEqual([]);
		resetSfxForTests();
		expect(isSfxMuted()).toBe(true);
	});

	it("plays a place thud when unmuted", () => {
		const fake = fakeBackend();
		attachSfxBackend(fake.audio);
		playCue("place");
		expect(fake.tones.some((tone) => tone.type === "triangle" && tone.frequency === 168)).toBe(
			true,
		);
	});
});
