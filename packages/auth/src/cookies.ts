export function sessionCookieAttributes(baseURL: string) {
	if (baseURL.startsWith("https://")) {
		return {
			sameSite: "none" as const,
			secure: true,
			httpOnly: true,
			partitioned: true,
		};
	}
	return {
		sameSite: "lax" as const,
		secure: false,
		httpOnly: true,
	};
}
