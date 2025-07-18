import deno from "@deno/vite-plugin";
import devServer from "@hono/vite-dev-server";
import { defineConfig } from "vite";

export default defineConfig({
	server: {
		port: 8000,
	},
	cacheDir: "node_modules/.vite",
	esbuild: {
		jsx: "automatic",
		jsxImportSource: "hono/jsx/dom",
	},
	build: {
		rollupOptions: {
		input: {
						client: "./client/app.tsx",
						demo: "./client/demo.tsx",
					},
			output: {
							entryFileNames: "[name].js",
						},
		},
	},
	plugins: [
		deno(),
		devServer({
			entry: "server/index.tsx",
		}),
	],
});
