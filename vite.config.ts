import { fresh } from "@fresh/plugin-vite";
import { defineConfig, type Plugin } from "vite";

const PAPER_NODE_STUB = "\0paper-node-stub";
const NODE_MODULE_STUB = "\0node-module-stub";

/**
 * paper.js' browser build (paper-core.js) is a CommonJS bundle that statically
 * `require()`s its Node-only emulation layer (`./node/self.js`,
 * `./node/extend.js`) and, once wrapped for ESM, pulls in `node:module`. None of
 * that runs in the browser — the Node paths are guarded behind `self ||` and
 * `paper.agent.node` — but the bundler still follows the imports and chokes on
 * `node:module` / jsdom. paper's `browser` field maps these to `false`; the Fresh
 * Deno resolver doesn't honor that, so stub them with empty modules. Scoped to the
 * client bundle so the Deno server build is unaffected.
 */
const stubPaperNodeShims = (): Plugin => ({
	name: "stub-paper-node-shims",
	enforce: "pre",
	resolveId(source, importer) {
		const env = (this as { environment?: { name?: string } }).environment;
		if (env?.name !== "client") {
			return null;
		}
		if (source === "node:module" || source === "module") {
			return NODE_MODULE_STUB;
		}
		if (
			importer &&
			/[/\\]paper[/\\]/.test(importer) &&
			/[/\\]node[/\\](self|extend)\.js$/.test(source)
		) {
			return PAPER_NODE_STUB;
		}
		return null;
	},
	load(id) {
		if (id === NODE_MODULE_STUB) {
			return "export function createRequire() { return () => ({}); }\nexport default { createRequire };";
		}
		if (id === PAPER_NODE_STUB) {
			return "export default {};";
		}
		return null;
	},
});

export default defineConfig({
	server: {
		port: 8000,
	},
	plugins: [stubPaperNodeShims(), fresh()],
});
