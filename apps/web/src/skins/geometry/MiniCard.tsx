import { type CardId, splitCardId } from "@crew/protocol";
import styles from "./mini-card.module.css";

type MiniCardProps = {
	cardId: CardId;
	size?: "sm" | "md" | "lg";
};

export function MiniCard({ cardId, size = "md" }: MiniCardProps) {
	const { suit, value } = splitCardId(cardId);
	return (
		<div className={[styles.mini, styles[size]].join(" ")} data-suit={suit}>
			<span className={styles.value}>{value}</span>
		</div>
	);
}
