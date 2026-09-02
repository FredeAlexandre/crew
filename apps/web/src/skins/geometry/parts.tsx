import type { CardId, SonarPosition } from "@crew/protocol";
import type { HandCard, SeatView, TaskView } from "@crew/view-model/fixtures";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { useRef } from "react";
import { Button as Pressable } from "react-aria-components";
import { Button } from "../../components/ui/button.tsx";
import { Toggle } from "../../components/ui/toggle.tsx";
import { useSfxMuted } from "../../hooks/use-sfx-muted.ts";
import { identiconUrl } from "../../lib/avatar.ts";
import { useI18n } from "../../lib/i18n.tsx";
import { CardFace } from "./Card.tsx";
import { seatIdenticonSeed, seatIsEmpty, seatName, sonarPositionCopy } from "./copy.ts";
import { cardIndexFromRects } from "./hand-layout.ts";
import styles from "./parts.module.css";
import { type TaskCardSize, TaskCatalogCard } from "./TaskCatalogCard.tsx";

function SonarIcon() {
	return (
		<svg className={styles.sonarIcon} viewBox="0 0 16 16" aria-hidden="true">
			<path
				d="M8 11.5a3.5 3.5 0 0 0 3.5-3.5M8 13a5 5 0 0 0 5-5M8 14.5a6.5 6.5 0 0 0 6.5-6.5"
				fill="none"
				stroke="currentColor"
				strokeWidth="1.4"
				strokeLinecap="round"
			/>
			<circle cx="8" cy="8" r="1.1" fill="currentColor" />
		</svg>
	);
}

function CrownIcon() {
	return (
		<svg className={styles.crown} viewBox="0 0 20 14" aria-hidden="true">
			<path d="M2 11.5 4.2 4.8l3.3 3.6L10 3.5l2.5 4.9 3.3-3.6L18 11.5H2Z" fill="currentColor" />
			<rect x="2" y="11.5" width="16" height="2" rx="0.4" fill="currentColor" />
		</svg>
	);
}

export function SeatAvatar({
	seat,
	self = false,
	compact = false,
	showName = true,
}: {
	seat: SeatView;
	self?: boolean;
	compact?: boolean;
	showName?: boolean;
}) {
	const { t } = useI18n();
	const empty = seatIsEmpty(seat);
	return (
		<div
			className={compact ? styles.avatarWrapCompact : styles.avatarWrap}
			data-turn={seat.isTurn ? "true" : "false"}
			data-captain={seat.isCaptain ? "true" : "false"}
			data-connected={seat.connected ? "true" : "false"}
			data-leaving={seat.leaving ? "true" : "false"}
		>
			{seat.isCaptain ? <CrownIcon /> : <span className={styles.crownHole} aria-hidden="true" />}
			{seat.isCaptain ? <span className={styles.srOnly}>{t("captain")}</span> : null}
			{seat.isTurn ? <span className={styles.srOnly}>{t("theirTurn")}</span> : null}
			<span
				className={compact ? styles.avatarCompact : styles.avatar}
				data-empty={empty ? "true" : "false"}
				data-self={self ? "true" : "false"}
				aria-hidden="true"
			>
				{empty ? null : (
					<img
						className={styles.avatarPhoto}
						src={seat.image ?? identiconUrl(seatIdenticonSeed(seat))}
						alt=""
					/>
				)}
			</span>
			{!empty && !seat.connected ? (
				<span
					className={styles.connectionDots}
					role="img"
					aria-label={seat.leaving ? t("leaving") : t("reconnecting")}
				>
					•••
				</span>
			) : null}
			{showName ? (
				<span className={styles.pipName}>{empty ? t("empty") : seatName(seat, t)}</span>
			) : null}
		</div>
	);
}

function SonarLiveDot({
	state,
	onPress,
}: {
	state: SeatView["sonar"]["state"];
	onPress?: () => void;
}) {
	const { t } = useI18n();
	const available = state === "available";
	const body = <span className={styles.sonarLive} data-state={state} />;
	if (onPress) {
		return (
			<Pressable
				className={styles.sonarLiveBtn}
				onPress={onPress}
				aria-label={available ? t("sonarAvailable") : t("sonarUsed")}
			>
				{body}
			</Pressable>
		);
	}
	return body;
}

function PlayTrickCount({ count, onPeek }: { count: number; onPeek?: () => void }) {
	const { t } = useI18n();
	const label = t(count === 1 ? "tricksWonOne" : "tricksWonMany", { count });
	if (onPeek) {
		return (
			<Pressable
				className={styles.seatTrickCountBtn}
				onPress={onPeek}
				aria-label={`${label}. ${t("peekLastTrick")}`}
			>
				{count}
			</Pressable>
		);
	}
	return (
		<span className={styles.seatTrickCount}>
			<span className={styles.srOnly}>{label}</span>
			<span aria-hidden="true">{count}</span>
		</span>
	);
}

function SonarTokenButton({
	state,
	onPress,
}: {
	state: SeatView["sonar"]["state"];
	onPress?: () => void;
}) {
	const { t } = useI18n();
	const available = state === "available";
	const body = (
		<span className={styles.sonarToken} data-state={state}>
			<SonarIcon />
		</span>
	);
	if (onPress) {
		return (
			<Pressable
				className={styles.sonarTokenBtn}
				onPress={onPress}
				aria-label={available ? t("sonarAvailable") : t("sonarUsed")}
			>
				{body}
			</Pressable>
		);
	}
	return body;
}

function CommunicatedSlot({
	cardId,
	position,
	onPress,
}: {
	cardId: CardId;
	position: SonarPosition;
	onPress?: () => void;
}) {
	const body = (
		<span className={styles.commSlot}>
			<CardFace cardId={cardId} communicated size="token" />
			<span className={styles.commSonarMark} data-position={position}>
				<SonarIcon />
			</span>
		</span>
	);
	const { t } = useI18n();
	if (onPress) {
		return (
			<Pressable className={styles.commSlotBtn} onPress={onPress} aria-label={t("sonarClue")}>
				{body}
			</Pressable>
		);
	}
	return body;
}

export function PlaySeat({
	seat,
	onPeekLastTrick,
	onSonarDetail,
	onInspectTask,
	canSonar,
	canPass,
	onSonar,
	onPass,
	chairClassName,
}: {
	seat: SeatView;
	onPeekLastTrick?: () => void;
	onSonarDetail?: () => void;
	onInspectTask?: (task: TaskView) => void;
	canSonar?: boolean;
	canPass?: boolean;
	onSonar?: () => void;
	onPass?: () => void;
	chairClassName?: string;
}) {
	const { t } = useI18n();
	const empty = seatIsEmpty(seat);
	const self = seat.region === "seat.self";
	const communication = seat.sonar.communication;
	const hasBody = seat.tasks.length > 0 || Boolean(communication);
	return (
		<div
			className={chairClassName}
			data-region={seat.region}
			data-turn={seat.isTurn ? "true" : "false"}
			data-empty={empty ? "true" : "false"}
			data-self={self ? "true" : "false"}
		>
			<div
				className={styles.playSeat}
				data-self={self ? "true" : "false"}
				data-turn={seat.isTurn ? "true" : "false"}
			>
				<div className={styles.seatHead}>
					<SeatAvatar seat={seat} self={self} showName={false} />
					{empty ? (
						<span className={styles.pipName}>{t("empty")}</span>
					) : (
						<div className={styles.seatNameRow}>
							<SonarLiveDot
								state={seat.sonar.state}
								onPress={self && canSonar && onSonar ? onSonar : onSonarDetail}
							/>
							<span className={styles.pipName}>{seatName(seat, t)}</span>
							<PlayTrickCount count={seat.wonTrickCount} onPeek={onPeekLastTrick} />
						</div>
					)}
				</div>
				{hasBody ? (
					<div className={styles.seatBody}>
						{seat.tasks.length > 0 ? (
							<div className={styles.seatTasks} data-region={self ? "tasks.self" : undefined}>
								{seat.tasks.map((task) => (
									<TaskMark
										key={task.instanceId}
										task={task}
										size="compact"
										onInspect={onInspectTask}
									/>
								))}
							</div>
						) : null}
						{communication ? (
							<CommunicatedSlot
								cardId={communication.cardId}
								position={communication.position}
								onPress={onSonarDetail}
							/>
						) : null}
					</div>
				) : null}
				{self && canPass && onPass ? (
					<div className={styles.seatActions}>
						<Button variant="outline" size="sm" onPress={onPass}>
							{t("pass")}
						</Button>
					</div>
				) : null}
			</div>
		</div>
	);
}

export function SonarDetailBody({ seat }: { seat: SeatView }) {
	const { t } = useI18n();
	const communication = seat.sonar.communication;
	return (
		<>
			<p className={styles.detailTitle}>{t("sonarNamed", { name: seatName(seat, t) })}</p>
			{communication ? (
				<>
					<CommunicatedSlot cardId={communication.cardId} position={communication.position} />
					<p className={styles.detailCopy}>{sonarPositionCopy(communication.position, t)}</p>
				</>
			) : (
				<>
					<SonarTokenButton state={seat.sonar.state} />
					<p className={styles.detailCopy}>
						{seat.sonar.state === "available" ? t("sonarAvailableCopy") : t("sonarUsedCopy")}
					</p>
				</>
			)}
		</>
	);
}

function WonCount({
	count,
	onPeek,
	hole = false,
}: {
	count: number;
	onPeek?: () => void;
	hole?: boolean;
}) {
	const { t } = useI18n();
	if (count <= 0) {
		return hole ? <span className={styles.wonHole} /> : null;
	}
	if (onPeek) {
		return (
			<Pressable className={styles.wonPeek} onPress={onPeek} aria-label={t("lastTrick")}>
				{count}
			</Pressable>
		);
	}
	return <span className={styles.won}>{count}</span>;
}

export function SeatPip({
	seat,
	compact = false,
	onPeekLastTrick,
}: {
	seat: SeatView;
	compact?: boolean;
	onPeekLastTrick?: () => void;
}) {
	const empty = seatIsEmpty(seat);
	return (
		<div
			className={compact ? styles.pipCompact : styles.pip}
			data-region={seat.region}
			data-turn={seat.isTurn ? "true" : "false"}
			data-empty={empty ? "true" : "false"}
		>
			<SeatAvatar seat={seat} self={seat.region === "seat.self"} compact={compact} />
			<span className={styles.sonar} data-state={seat.sonar.state} />
			<WonCount count={seat.wonTrickCount} onPeek={onPeekLastTrick} hole />
			{seat.sonar.communication ? (
				<CardFace cardId={seat.sonar.communication.cardId} communicated size="token" />
			) : null}
			{compact && seat.tasks.length > 0 ? (
				<span className={styles.taskCount}>{seat.tasks.length}</span>
			) : null}
			{!compact && seat.tasks.length > 0 ? (
				<div className={styles.dockTasks}>
					{seat.tasks.map((task) => (
						<TaskMark key={task.instanceId} task={task} />
					))}
				</div>
			) : null}
		</div>
	);
}

export function TaskMark({
	task,
	size = "compact",
	onInspect,
}: {
	task: TaskView;
	size?: Exclude<TaskCardSize, "catalog">;
	onInspect?: (task: TaskView) => void;
}) {
	return (
		<TaskCatalogCard
			task={task.spec}
			size={size}
			status={task.status}
			region={task.region}
			prediction={task.prediction}
			onPress={onInspect ? () => onInspect(task) : undefined}
		/>
	);
}

export function TaskCard({ task, onTake }: { task: TaskView; onTake?: (task: TaskView) => void }) {
	return (
		<TaskCatalogCard
			task={task.spec}
			size="table"
			status={task.status}
			takeable={task.takeable}
			showMeta
			region={task.region}
			prediction={task.prediction}
			onPress={task.takeable && onTake ? () => onTake(task) : undefined}
		/>
	);
}

export function HandStrip({
	cards,
	selected,
	quiet = false,
	tucked = false,
	nudged = null,
	onSelect,
	onActivate,
}: {
	cards: HandCard[];
	selected: CardId | null;
	quiet?: boolean;
	tucked?: boolean;
	nudged?: CardId | null;
	onSelect?: (cardId: CardId) => void;
	onActivate?: (cardId: CardId) => void;
}) {
	const rootRef = useRef<HTMLDivElement>(null);
	const peeking = useRef(false);
	const moved = useRef(false);
	const startSelected = useRef<CardId | null>(null);
	const startX = useRef(0);
	const startY = useRef(0);
	const selectedIndex =
		selected === null ? -1 : cards.findIndex((card) => card.cardId === selected);

	function cardAtPointer(
		event: ReactPointerEvent<HTMLDivElement>,
	): { id: CardId; index: number } | null {
		const el = rootRef.current;
		if (!el || cards.length === 0) {
			return null;
		}
		const rects = Array.from(el.children, (slot) => slot.getBoundingClientRect());
		const index = cardIndexFromRects(
			event.clientX,
			event.clientY,
			rects,
			selectedIndex >= 0 ? selectedIndex : null,
		);
		const id = index === null ? undefined : cards[index]?.cardId;
		if (index === null || id === undefined) {
			return null;
		}
		return { id, index };
	}

	function selectAtPointer(event: ReactPointerEvent<HTMLDivElement>) {
		const hit = cardAtPointer(event);
		if (hit) {
			onSelect?.(hit.id);
		}
	}

	function beginPeek(event: ReactPointerEvent<HTMLDivElement>) {
		if (tucked || event.button !== 0 || cards.length === 0) {
			return;
		}
		event.preventDefault();
		startSelected.current = selected;
		moved.current = false;
		startX.current = event.clientX;
		startY.current = event.clientY;
		const touchLike = event.pointerType === "touch" || event.pointerType === "pen";
		if (touchLike) {
			peeking.current = true;
			event.currentTarget.setPointerCapture(event.pointerId);
		}
		selectAtPointer(event);
	}

	function movePeek(event: ReactPointerEvent<HTMLDivElement>) {
		const dx = event.clientX - startX.current;
		const dy = event.clientY - startY.current;
		if (dx * dx + dy * dy > 100) {
			moved.current = true;
		}
		if (peeking.current || event.buttons > 0) {
			selectAtPointer(event);
			return;
		}
		if (event.pointerType === "mouse") {
			selectAtPointer(event);
		}
	}

	function endPeek(event: ReactPointerEvent<HTMLDivElement>) {
		const hit = cardAtPointer(event);
		if (peeking.current) {
			peeking.current = false;
			if (event.currentTarget.hasPointerCapture(event.pointerId)) {
				event.currentTarget.releasePointerCapture(event.pointerId);
			}
		}
		if (event.type === "pointercancel") {
			if (hit) {
				onSelect?.(hit.id);
			}
			return;
		}
		if (!moved.current && hit !== null && hit.id === startSelected.current) {
			onActivate?.(hit.id);
			return;
		}
		if (hit) {
			onSelect?.(hit.id);
		}
	}

	return (
		<div
			className={quiet ? `${styles.fanClip} ${styles.fanQuiet}` : styles.fanClip}
			data-tucked={tucked ? "true" : "false"}
		>
			<div
				ref={rootRef}
				className={styles.fan}
				data-region="hand"
				data-count={String(cards.length)}
				data-tucked={tucked ? "true" : "false"}
				onPointerDown={tucked ? undefined : beginPeek}
				onPointerMove={tucked ? undefined : movePeek}
				onPointerUp={tucked ? undefined : endPeek}
				onPointerCancel={tucked ? undefined : endPeek}
			>
				{cards.map((card, index) => {
					const raised = selected === card.cardId;
					return (
						<div
							key={card.cardId}
							className={styles.fanSlot}
							data-raised={raised ? "true" : "false"}
							data-nudge={nudged === card.cardId ? "true" : "false"}
							style={
								{
									"--i": index,
									"--n": cards.length,
									"--z": raised ? 24 : index + 1,
								} as CSSProperties
							}
						>
							<CardFace
								cardId={card.cardId}
								legal={card.legal}
								communicated={card.communicated}
								selected={raised}
								muted={quiet}
								revealed={raised}
							/>
						</div>
					);
				})}
			</div>
		</div>
	);
}

export function SoundToggle() {
	const { t } = useI18n();
	const [muted, setMuted] = useSfxMuted();
	return (
		<Toggle
			isSelected={!muted}
			aria-label={muted ? t("soundOff") : t("soundOn")}
			onChange={(selected) => setMuted(!selected)}
		>
			{muted ? t("muted") : t("sound")}
		</Toggle>
	);
}
