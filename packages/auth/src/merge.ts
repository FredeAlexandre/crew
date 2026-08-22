import { type createDb, players, rooms, user } from "@crew/db";
import { eq } from "drizzle-orm";

const GENERATED_GUEST_NAME = /^Guest [0-9a-f]{8}$/i;

export function isChosenDisplayName(name: string): boolean {
	const trimmed = name.trim();
	return trimmed.length > 0 && !GENERATED_GUEST_NAME.test(trimmed);
}

export function pickMergedName(guestName: string, realName: string): string {
	if (isChosenDisplayName(realName)) {
		return realName;
	}
	if (isChosenDisplayName(guestName)) {
		return guestName;
	}
	return realName;
}

export function pickMergedImage(
	guestImage: string | null | undefined,
	realImage: string | null | undefined,
): string | null {
	return realImage ?? guestImage ?? null;
}

export function guestHasMergeableData(input: {
	guestName: string;
	guestImage: string | null | undefined;
	hostedRoomCount: number;
}): boolean {
	return (
		input.hostedRoomCount > 0 || isChosenDisplayName(input.guestName) || Boolean(input.guestImage)
	);
}

export async function mergeAnonymousAccount(
	db: ReturnType<typeof createDb>,
	anonymousUserId: string,
	realUserId: string,
): Promise<void> {
	if (anonymousUserId === realUserId) {
		return;
	}

	const guestRows = await db.select().from(user).where(eq(user.id, anonymousUserId)).limit(1);
	const realRows = await db.select().from(user).where(eq(user.id, realUserId)).limit(1);
	const guest = guestRows[0];
	const real = realRows[0];
	if (guest === undefined || real === undefined) {
		return;
	}

	const hosted = await db.select().from(rooms).where(eq(rooms.hostPlayerId, anonymousUserId));
	if (
		!guestHasMergeableData({
			guestName: guest.name,
			guestImage: guest.image,
			hostedRoomCount: hosted.length,
		})
	) {
		return;
	}

	const mergedName = pickMergedName(guest.name, real.name);
	const mergedImage = pickMergedImage(guest.image, real.image);
	if (mergedName !== real.name || mergedImage !== (real.image ?? null)) {
		await db
			.update(user)
			.set({ name: mergedName, image: mergedImage })
			.where(eq(user.id, realUserId));
	}

	const realPlayerRows = await db
		.select()
		.from(players)
		.where(eq(players.userId, realUserId))
		.limit(1);
	const realPlayer = realPlayerRows[0];
	if (realPlayer === undefined) {
		await db.insert(players).values({
			id: realUserId,
			userId: realUserId,
			displayName: mergedName,
		});
	} else if (realPlayer.displayName !== mergedName) {
		await db.update(players).set({ displayName: mergedName }).where(eq(players.id, realPlayer.id));
	}

	if (hosted.length > 0) {
		await db
			.update(rooms)
			.set({ hostPlayerId: realUserId })
			.where(eq(rooms.hostPlayerId, anonymousUserId));
	}
}
