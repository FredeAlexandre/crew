import type { Suit } from "@crew/protocol";
import styles from "./suit-mark.module.css";

type SuitMarkProps = {
	suit: Suit;
	size?: "sm" | "md" | "lg" | "xl";
	className?: string;
};

export function SuitMark({ suit, size = "md", className }: SuitMarkProps) {
	return (
		<span
			className={[styles.mark, styles[size], className].filter(Boolean).join(" ")}
			data-suit={suit}
			aria-hidden="true"
		/>
	);
}
