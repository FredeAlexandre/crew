import type { Suit } from "@crew/protocol";
import styles from "./suit-mark.module.css";

type SuitMarkProps = {
	suit: Suit;
	size?: "sm" | "md" | "lg" | "xl";
	className?: string;
	detailed?: boolean;
};

const HULL = "M20 32 26 21 56 17H100A15 15 0 0 1 100 47H56L26 43Z";
const PORTS =
	"M62 32a4.4 4.4 0 1 0 8.8 0 4.4 4.4 0 1 0-8.8 0M80 32a4.4 4.4 0 1 0 8.8 0 4.4 4.4 0 1 0-8.8 0M98 32a4.4 4.4 0 1 0 8.8 0 4.4 4.4 0 1 0-8.8 0";

function SubmarineParts({ detailed }: { detailed: boolean }) {
	return (
		<>
			<ellipse cx="16" cy="32" rx="5.4" ry="9" />
			<path fillRule="evenodd" d={detailed ? `${HULL}${PORTS}` : HULL} />
			<path d="M72 17V5.5h6L82 2h30L117 5.5V17Z" />
			<path d="M98 2V0h15v2.2H101V2Z" />
			<rect x="96" y="12.5" width="16" height="5" rx="1.4" />
			<rect x="96" y="42.5" width="16" height="5" rx="1.4" />
			<path d="M74 47h22v7H74Z" />
			<path d="M30 10h8v11h-5L30 10Z" />
		</>
	);
}

export function SuitMark({ suit, size = "md", className, detailed = false }: SuitMarkProps) {
	return (
		<span
			className={[styles.mark, styles[size], className].filter(Boolean).join(" ")}
			data-suit={suit}
			aria-hidden="true"
		>
			{suit === "submarine" ? (
				<svg className={styles.glyph} viewBox="0 0 140 60" aria-hidden="true" focusable="false">
					<SubmarineParts detailed={detailed} />
				</svg>
			) : null}
		</span>
	);
}
