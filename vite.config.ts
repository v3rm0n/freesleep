import deno from "@deno/vite-plugin";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [deno()],
	esbuild: {
		jsx: "automatic",
		jsxImportSource: "hono/jsx",
	},
	build: {
		rollupOptions: {
			input: "./client/app.tsx",
			output: {
				entryFileNames: "client.js",
			},
		},
	},
});
