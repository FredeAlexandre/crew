import { type CardId, splitCardId } from "@crew/protocol";
import styles from "./mini-card.module.css";
import { SuitMark } from "./SuitMark.tsx";

type MiniCardProps = {
	cardId: CardId;
	size?: "sm" | "md" | "lg";
};

export function MiniCard({ cardId, size = "md" }: MiniCardProps) {
	const { suit, value } = splitCardId(cardId);
	const corner = (
		<span className={styles.corner}>
			<span className={styles.value}>{value}</span>
			<SuitMark suit={suit} size="sm" />
		</span>
	);

	return (
		<div className={[styles.mini, styles[size]].join(" ")} data-suit={suit}>
			{corner}
			<SuitMark suit={suit} size={size === "lg" ? "lg" : "md"} className={styles.center} />
			<span className={[styles.corner, styles.cornerTail].join(" ")} aria-hidden="true">
				<span className={styles.value}>{value}</span>
				<SuitMark suit={suit} size="sm" />
			</span>
		</div>
	);
}
