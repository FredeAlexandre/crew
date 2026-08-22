import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
	clientPrefix: "VITE_",
	client: {
		VITE_SERVER_URL: z.url(),
		VITE_PREVIEW_LABEL: z.string().min(1).optional(),
	},
	runtimeEnv: (import.meta as ImportMeta & { env: Record<string, string | undefined> }).env,
	emptyStringAsUndefined: true,
});
