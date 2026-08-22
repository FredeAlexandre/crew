import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from "react";

type IdentitySheetIntent = "signin";

type IdentitySheetApi = {
	openSignIn: () => void;
	intent: IdentitySheetIntent | null;
	clearIntent: () => void;
};

const IdentitySheetContext = createContext<IdentitySheetApi | null>(null);

export function IdentitySheetProvider({ children }: { children: ReactNode }) {
	const [intent, setIntent] = useState<IdentitySheetIntent | null>(null);
	const openSignIn = useCallback(() => {
		setIntent("signin");
	}, []);
	const clearIntent = useCallback(() => {
		setIntent(null);
	}, []);
	const value = useMemo(
		() => ({ openSignIn, intent, clearIntent }),
		[openSignIn, intent, clearIntent],
	);
	return <IdentitySheetContext.Provider value={value}>{children}</IdentitySheetContext.Provider>;
}

export function useIdentitySheet(): IdentitySheetApi {
	const ctx = useContext(IdentitySheetContext);
	if (ctx === null) {
		throw new Error("useIdentitySheet requires IdentitySheetProvider");
	}
	return ctx;
}
