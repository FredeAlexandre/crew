import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
	server: {
		host: "127.0.0.1",
		port: 3001,
		proxy: {
			"/api": "http://localhost:3000",
			"/room": {
				target: "http://localhost:3000",
				ws: true,
			},
		},
	},
	resolve: {
		tsconfigPaths: true,
	},
	plugins: [
		tanstackRouter({
			target: "react",
			autoCodeSplitting: true,
		}),
		react(),
		tailwindcss(),
	],
});
