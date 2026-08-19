import { env } from "@crew/env/web";
import { anonymousClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

function serverOrigin(url: string) {
	return url.endsWith("/") ? url.slice(0, -1) : url;
}

export const authClient = createAuthClient({
	baseURL: new URL("/api/auth", serverOrigin(env.VITE_SERVER_URL)).toString(),
	plugins: [anonymousClient()],
});
