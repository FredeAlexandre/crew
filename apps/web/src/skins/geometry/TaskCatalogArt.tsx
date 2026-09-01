import { type CardId, COLOR_SUITS, type ColorSuit, type TaskPublic } from "@crew/protocol";
import type { CSSProperties, ReactNode } from "react";
import { useI18n } from "../../lib/i18n.tsx";
import { MiniCard } from "./MiniCard.tsx";
import { SuitMark } from "./SuitMark.tsx";
import styles from "./task-catalog-art.module.css";

function TrickPile({ highlight = false, dim = false }: { highlight?: boolean; dim?: boolean }) {
	return (
		<div
			className={styles.trickPile}
			data-highlight={highlight ? "true" : undefined}
			data-dim={dim ? "true" : undefined}
		/>
	);
}

function TrickStacks({ count, highlightIndex }: { count: number; highlightIndex?: number }) {
	const shown = Math.min(count, 4);
	return (
		<div className={styles.row}>
			{Array.from({ length: shown }, (_, index) => (
				<TrickPile
					key={index}
					highlight={highlightIndex === index + 1}
					dim={highlightIndex !== undefined && highlightIndex !== index + 1}
				/>
			))}
			{count > shown ? <span className={styles.countSm}>+{count - shown}</span> : null}
		</div>
	);
}

function SuitRepeat({ suit, count }: { suit: ColorSuit | "submarine"; count: number }) {
	const shown = Math.min(count, 6);
	return (
		<div className={styles.row}>
			{Array.from({ length: shown }, (_, index) => (
				<SuitMark key={index} suit={suit} size={count > 3 ? "sm" : "md"} />
			))}
			{count > shown ? <span className={styles.countSm}>×{count}</span> : null}
		</div>
	);
}

function CompareOp({ op }: { op: "moreThan" | "fewerThan" | "equalTo" }) {
	const symbol = op === "moreThan" ? ">" : op === "fewerThan" ? "<" : "=";
	return <span className={styles.op}>{symbol}</span>;
}

function TrickCountOp({ op }: { op: "exact" | "atLeast" | "atMost" }) {
	const symbol = op === "exact" ? "=" : op === "atLeast" ? "≥" : "≤";
	return <span className={styles.op}>{symbol}</span>;
}

function SumOp({ op }: { op: "gt" | "lt" | "eq" }) {
	const symbol = op === "gt" ? ">" : op === "lt" ? "<" : "=";
	return <span className={styles.op}>{symbol}</span>;
}

function WinWithArt({ spec }: { spec: Extract<TaskPublic, { kind: "winWith" }> }) {
	if (spec.card) {
		return (
			<div className={styles.winWith}>
				<MiniCard cardId={spec.card} size="lg" />
				<span className={styles.playArrow} aria-hidden="true" />
			</div>
		);
	}
	if (spec.suit && spec.value !== undefined) {
		return (
			<div className={styles.winWith}>
				<span className={styles.count}>{spec.value}</span>
				<SuitMark suit={spec.suit} size="xl" />
				<span className={styles.playArrow} aria-hidden="true" />
			</div>
		);
	}
	if (spec.suit) {
		return (
			<div className={styles.winWith}>
				<SuitMark suit={spec.suit} size="xl" />
				<span className={styles.playArrow} aria-hidden="true" />
			</div>
		);
	}
	if (spec.value !== undefined) {
		return (
			<div className={styles.winWith}>
				<span className={styles.count}>{spec.value}</span>
				<div className={styles.row}>
					{COLOR_SUITS.map((suit) => (
						<SuitMark key={suit} suit={suit} size="sm" />
					))}
				</div>
			</div>
		);
	}
	return null;
}

function AvoidArt({ spec }: { spec: Extract<TaskPublic, { kind: "avoid" }> }) {
	let body: ReactNode;
	if (spec.submarines) {
		body = (
			<div className={styles.subRow}>
				<SuitMark suit="submarine" size="lg" />
				<SuitMark suit="submarine" size="lg" />
			</div>
		);
	} else if (spec.suit) {
		body = <SuitMark suit={spec.suit} size="xl" />;
	} else if (spec.value !== undefined) {
		body = <span className={styles.count}>{spec.value}</span>;
	} else if (spec.cards) {
		body = (
			<div className={styles.row}>
				{spec.cards.map((cardId: CardId) => (
					<MiniCard key={cardId} cardId={cardId} size="sm" />
				))}
			</div>
		);
	} else {
		body = <span className={styles.op}>×</span>;
	}
	return <div className={styles.avoidWrap}>{body}</div>;
}

function FilterArt({ spec }: { spec: Extract<TaskPublic, { kind: "trickFilter" }> }) {
	const samples =
		spec.filter === "allOdd"
			? [1, 3, 5, 7]
			: spec.filter === "allEven"
				? [2, 4, 6, 8]
				: spec.filter === "allGt"
					? [6, 7, 8, 9]
					: [1, 2, 3, 4];

	return (
		<div className={styles.row}>
			{samples.map((value) => (
				<span
					key={value}
					className={styles.filterCard}
					data-odd={value % 2 === 1 ? "true" : undefined}
					data-even={value % 2 === 0 ? "true" : undefined}
				>
					{value}
				</span>
			))}
			{spec.bound !== undefined ? (
				<span className={styles.badge}>
					{spec.filter === "allGt" ? `>${spec.bound}` : `<${spec.bound}`}
				</span>
			) : null}
		</div>
	);
}

export function TaskCatalogArt({ spec }: { spec: TaskPublic }) {
	const { t } = useI18n();
	switch (spec.kind) {
		case "winCards":
			return (
				<div className={styles.art}>
					<div className={styles.row}>
						{spec.cards.map((cardId) => (
							<MiniCard key={cardId} cardId={cardId} size={spec.cards.length > 2 ? "sm" : "md"} />
						))}
					</div>
				</div>
			);
		case "winColor":
			return (
				<div className={styles.art}>
					<div className={styles.stack}>
						<span className={styles.count}>{spec.count}</span>
						<SuitRepeat suit={spec.suit} count={spec.count} />
						<TrickStacks count={spec.count} />
					</div>
				</div>
			);
		case "winValue":
			return (
				<div className={styles.art}>
					<div className={styles.stack}>
						<span className={styles.count}>{spec.value}</span>
						<div className={styles.row}>
							{COLOR_SUITS.map((suit) => (
								<SuitMark key={suit} suit={suit} size="sm" />
							))}
						</div>
						<TrickStacks count={spec.count} />
					</div>
				</div>
			);
		case "winSubmarines":
			return (
				<div className={styles.art}>
					<div className={styles.stack}>
						<SuitRepeat suit="submarine" count={spec.count} />
						<TrickStacks count={spec.count} />
					</div>
				</div>
			);
		case "winWith":
			return (
				<div className={styles.art}>
					<WinWithArt spec={spec} />
				</div>
			);
		case "avoid":
			return (
				<div className={styles.art}>
					<AvoidArt spec={spec} />
				</div>
			);
		case "trickCount":
			return (
				<div className={styles.art}>
					<div className={styles.stack}>
						<div className={styles.row}>
							<TrickCountOp op={spec.op} />
							<span className={styles.count}>{spec.count}</span>
						</div>
						<TrickStacks count={Math.max(spec.count, 1)} />
					</div>
				</div>
			);
		case "consecutiveTricks":
			return (
				<div className={styles.art}>
					<div className={styles.chain}>
						{Array.from({ length: spec.count }, (_, index) => (
							<span key={index} className={styles.row}>
								{index > 0 ? <span className={styles.chainLink} aria-hidden="true" /> : null}
								<TrickPile highlight />
							</span>
						))}
					</div>
				</div>
			);
		case "nthTrick": {
			const slot = spec.n === 0 ? 4 : spec.n;
			return (
				<div className={styles.art}>
					<div className={styles.timeline}>
						<TrickStacks count={4} highlightIndex={slot} />
						{spec.n === 0 ? <span className={styles.badge}>{t("artLast")}</span> : null}
					</div>
				</div>
			);
		}
		case "compareTricks":
			return (
				<div className={styles.art}>
					<div className={styles.compare}>
						<div className={styles.compareCol}>
							<span className={styles.compareLabel}>{t("artYou")}</span>
							<div className={styles.compareStacks}>
								<TrickPile highlight />
								<TrickPile highlight />
							</div>
						</div>
						<CompareOp op={spec.op} />
						<div className={styles.compareCol}>
							<span className={styles.compareLabel}>
								{spec.vs === "captain" ? t("artCaptain") : t("artEach")}
							</span>
							<div className={styles.compareStacks}>
								<TrickPile />
								<TrickPile />
							</div>
						</div>
					</div>
				</div>
			);
		case "trickSum":
			return (
				<div className={styles.art}>
					<div className={styles.stack}>
						<div className={styles.sumRow}>
							<span className={styles.filterCard}>4</span>
							<span className={styles.op}>+</span>
							<span className={styles.filterCard}>7</span>
							<span className={styles.op}>+</span>
							<span className={styles.filterCard}>5</span>
						</div>
						<div className={styles.row}>
							<SumOp op={spec.op} />
							<span className={styles.count}>{spec.target}</span>
						</div>
						{spec.noSubmarines ? <span className={styles.badge}>{t("artNoSub")}</span> : null}
					</div>
				</div>
			);
		case "trickFilter":
			return (
				<div className={styles.art}>
					<FilterArt spec={spec} />
				</div>
			);
		case "collectAllColors":
			return (
				<div className={styles.art}>
					<div className={styles.row}>
						{COLOR_SUITS.map((suit) => (
							<SuitMark key={suit} suit={suit} size="lg" />
						))}
					</div>
				</div>
			);
		case "collectAllOfOneColor":
			return (
				<div className={styles.art}>
					<div className={styles.suitGrid} data-full="true">
						{Array.from({ length: 9 }, (_, index) => (
							<span
								key={index}
								className={styles.cell}
								style={{ "--suit": "var(--suit-pink)" } as CSSProperties}
							>
								<SuitMark suit="pink" size="sm" />
							</span>
						))}
					</div>
				</div>
			);
		case "collectMoreColor":
			return (
				<div className={styles.art}>
					<div className={styles.moreLess}>
						<div className={styles.moreCol}>
							<SuitMark suit={spec.more} size="lg" />
							<SuitMark suit={spec.more} size="md" />
							<SuitMark suit={spec.more} size="md" />
						</div>
						<span className={styles.op}>{">"}</span>
						<div className={styles.lessCol}>
							<SuitMark suit={spec.less} size="md" />
							<SuitMark suit={spec.less} size="sm" />
						</div>
					</div>
				</div>
			);
	}
}
