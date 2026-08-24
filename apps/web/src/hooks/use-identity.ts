import { useEffect, useRef, useState } from "react";
import { authClient } from "../lib/auth-client.ts";
import { displayInitials, visibleDisplayName } from "../lib/display-name.ts";
import { ensureGuestSession } from "../lib/rooms.ts";

type IdentityUser = {
	id: string;
	name: string;
	email: string;
	image: string | null;
	isAnonymous: boolean;
};

export function useIdentity(): {
	ready: boolean;
	sessionError: string | null;
	user: IdentityUser | null;
	displayName: string;
	initials: string;
	refetch: () => Promise<void>;
} {
	const session = authClient.useSession();
	const [sessionError, setSessionError] = useState<string | null>(null);
	const refetchRef = useRef(session.refetch);
	refetchRef.current = session.refetch;

	useEffect(() => {
		let cancelled = false;
		void ensureGuestSession()
			.then(() => {
				if (!cancelled) {
					void refetchRef.current();
				}
			})
			.catch(() => {
				if (!cancelled) {
					setSessionError("Could not start a guest session. Try again.");
				}
			});
		return () => {
			cancelled = true;
		};
	}, []);

	const raw = session.data?.user;
	const user: IdentityUser | null =
		raw === undefined
			? null
			: {
					id: raw.id,
					name: raw.name,
					email: raw.email,
					image: raw.image ?? null,
					isAnonymous: raw.isAnonymous === true,
				};

	return {
		ready: !session.isPending && user !== null,
		sessionError,
		user,
		displayName: user === null ? "" : visibleDisplayName(user.name),
		initials: user === null ? "" : displayInitials(user.name),
		async refetch() {
			await session.refetch();
		},
	};
}
