import { useEffect, useRef, useState } from "react";
import {
	createDebouncedAction,
	DISPLAY_NAME_DEBOUNCE_MS,
	visibleDisplayName,
} from "../lib/display-name.ts";
import { ensureGuestSession, persistDisplayName } from "../lib/rooms.ts";

export function useDisplayName(): {
	name: string;
	ready: boolean;
	sessionError: string | null;
	onChange: (value: string) => void;
	flush: () => Promise<void>;
} {
	const [name, setName] = useState("");
	const [ready, setReady] = useState(false);
	const [sessionError, setSessionError] = useState<string | null>(null);
	const nameRef = useRef(name);
	const saverRef = useRef(
		createDebouncedAction(async (value) => {
			await persistDisplayName(value);
		}, DISPLAY_NAME_DEBOUNCE_MS),
	);

	useEffect(() => {
		nameRef.current = name;
	}, [name]);

	useEffect(() => {
		let cancelled = false;
		void ensureGuestSession()
			.then((session) => {
				if (cancelled) {
					return;
				}
				setName(visibleDisplayName(session.displayName));
				setReady(true);
			})
			.catch(() => {
				if (!cancelled) {
					setSessionError("Could not start a guest session. Try again.");
				}
			});
		return () => {
			cancelled = true;
			saverRef.current.cancel();
		};
	}, []);

	return {
		name,
		ready,
		sessionError,
		onChange(value: string) {
			setName(value);
			saverRef.current.schedule(value);
		},
		flush() {
			return saverRef.current.flush(nameRef.current);
		},
	};
}
