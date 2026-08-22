import { type CardId, splitCardId } from "@crew/protocol";
import { Button } from "react-aria-components";
import styles from "./card.module.css";

type CardSize = "hand" | "trick" | "token";

type CardFaceProps = {
	cardId: CardId;
	legal?: boolean;
	selected?: boolean;
	communicated?: boolean;
	muted?: boolean;
	size?: CardSize;
	lead?: boolean;
	onPress?: () => void;
};

export function CardFace({
	cardId,
	legal = true,
	selected = false,
	communicated = false,
	muted = false,
	size = "hand",
	lead = false,
	onPress,
}: CardFaceProps) {
	const { suit, value } = splitCardId(cardId);
	const className = [
		styles.card,
		styles[size],
		legal ? "" : styles.illegal,
		selected ? styles.selected : "",
		communicated ? styles.communicated : "",
		muted ? styles.muted : "",
		lead ? styles.lead : "",
	]
		.filter(Boolean)
		.join(" ");

	const body = (
		<>
			<span className={styles.value}>{value}</span>
			<span className={styles.mark} data-suit={suit} />
		</>
	);

	if (onPress) {
		return (
			<Button
				className={className}
				data-suit={suit}
				onPress={onPress}
				aria-label={`${suit} ${value}`}
			>
				{body}
			</Button>
		);
	}

	return (
		<div className={className} data-suit={suit} title={`${suit} ${value}`}>
			{body}
		</div>
	);
}

export function CardBack({ size = "trick" }: { size?: CardSize }) {
	return <div className={`${styles.card} ${styles[size]} ${styles.back}`} aria-hidden="true" />;
}
