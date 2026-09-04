export function resolveApiOrigin(input: {
	dev: boolean;
	pageOrigin: string | undefined;
	serverUrl: string;
}): string {
	if (input.dev && input.pageOrigin !== undefined && input.pageOrigin.length > 0) {
		return input.pageOrigin.replace(/\/$/, "");
	}
	return input.serverUrl.replace(/\/$/, "");
}
