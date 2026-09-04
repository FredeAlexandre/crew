import { anonymousClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { apiOrigin } from "./api-origin.ts";

export const authClient = createAuthClient({
	baseURL: new URL("/api/auth", `${apiOrigin()}/`).toString(),
	plugins: [anonymousClient()],
});
