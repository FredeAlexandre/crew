import type { Suit } from "@crew/protocol";
import styles from "./suit-mark.module.css";

type SuitMarkProps = {
	suit: Suit;
	size?: "sm" | "md" | "lg" | "xl";
	className?: string;
};

type Glyph = { kind: "circle" } | { kind: "rect" } | { kind: "path"; d: string };

const GLYPH: Record<Suit, Glyph> = {
	pink: { kind: "circle" },
	yellow: {
		kind: "path",
		d: "M42.43 22.1A16 16 0 0 1 57.57 22.1L86.43 75.9A16 16 0 0 1 78 90L22 90A16 16 0 0 1 13.57 75.9Z",
	},
	green: { kind: "rect" },
	blue: {
		kind: "path",
		d: "M41.51 16.49A12 12 0 0 1 58.49 16.49L83.51 41.51A12 12 0 0 1 83.51 58.49L58.49 83.51A12 12 0 0 1 41.51 83.51L16.49 58.49A12 12 0 0 1 16.49 41.51Z",
	},
	submarine: {
		kind: "path",
		d: "M47.63 12.59A7 7 0 0 1 52.37 12.59L58.21 28.85A7 7 0 0 0 67.58 35.65L84.85 36.19A7 7 0 0 1 86.31 40.69L72.65 51.27A7 7 0 0 0 69.08 62.28L73.91 78.88A7 7 0 0 1 70.08 81.66L55.79 71.94A7 7 0 0 0 44.21 71.94L29.92 81.66A7 7 0 0 1 26.09 78.88L30.92 62.28A7 7 0 0 0 27.35 51.27L13.69 40.69A7 7 0 0 1 15.15 36.19L32.42 35.65A7 7 0 0 0 41.79 28.85Z",
	},
};

function SuitGlyph({ suit }: { suit: Suit }) {
	const glyph = GLYPH[suit];
	if (glyph.kind === "circle") {
		return <circle cx="50" cy="50" r="44" fill="currentColor" />;
	}
	if (glyph.kind === "rect") {
		return <rect x="8" y="8" width="84" height="84" rx="24" fill="currentColor" />;
	}
	return <path d={glyph.d} fill="currentColor" />;
}

export function SuitMark({ suit, size = "md", className }: SuitMarkProps) {
	return (
		<span
			className={[styles.mark, styles[size], className].filter(Boolean).join(" ")}
			data-suit={suit}
			aria-hidden="true"
		>
			<svg className={styles.glyph} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
				<SuitGlyph suit={suit} />
			</svg>
		</span>
	);
}
