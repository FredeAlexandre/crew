import type { ServerEnv } from "@crew/infra/alchemy.run";

export type CloudflareEnv = ServerEnv;

declare global {
	type Env = CloudflareEnv;
}

declare module "cloudflare:workers" {
	namespace Cloudflare {
		export interface Env extends CloudflareEnv {}
	}
}
