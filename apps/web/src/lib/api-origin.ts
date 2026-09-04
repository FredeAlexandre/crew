import { env } from "@crew/env/web";
import { resolveApiOrigin } from "./resolve-api-origin.ts";

export function apiOrigin(): string {
	return resolveApiOrigin({
		dev: import.meta.env.DEV,
		pageOrigin: typeof window === "undefined" ? undefined : window.location.origin,
		serverUrl: env.VITE_SERVER_URL,
	});
}
