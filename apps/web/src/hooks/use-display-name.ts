import { useEffect, useRef, useState } from "react";
import {
	createDebouncedAction,
	DISPLAY_NAME_DEBOUNCE_MS,
	visibleDisplayName,
} from "../lib/display-name.ts";
import { persistDisplayName } from "../lib/rooms.ts";
import { useIdentity } from "./use-identity.ts";

export function useDisplayName(): {
	name: string;
	ready: boolean;
	sessionError: string | null;
	onChange: (value: string) => void;
	flush: () => Promise<void>;
} {
	const identity = useIdentity();
	const [name, setName] = useState("");
	const nameRef = useRef(name);
	const refetchRef = useRef(identity.refetch);
	const storedName = identity.user?.name;
	const saverRef = useRef(
		createDebouncedAction(async (value) => {
			await persistDisplayName(value);
			await refetchRef.current();
		}, DISPLAY_NAME_DEBOUNCE_MS),
	);

	refetchRef.current = identity.refetch;

	useEffect(() => {
		nameRef.current = name;
	}, [name]);

	useEffect(() => {
		if (!identity.ready || storedName === undefined) {
			return;
		}
		setName(visibleDisplayName(storedName));
	}, [identity.ready, storedName]);

	useEffect(() => {
		const saver = saverRef.current;
		return () => {
			saver.cancel();
		};
	}, []);

	return {
		name,
		ready: identity.ready,
		sessionError: identity.sessionError,
		onChange(value: string) {
			setName(value);
			saverRef.current.schedule(value);
		},
		flush() {
			return saverRef.current.flush(nameRef.current);
		},
	};
}
