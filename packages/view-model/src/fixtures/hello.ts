export type HelloFixture = {
	readonly kind: "hello";
	readonly regions: readonly ["table"];
	readonly note: string;
};

export const helloFixture: HelloFixture = {
	kind: "hello",
	regions: ["table"],
	note: "Playground hello fixture. Real scene snapshots come later.",
};
