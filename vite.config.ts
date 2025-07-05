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
			input: "./src/client/app.tsx",
			output: {
				entryFileNames: "client.js",
			},
		},
	},
});
