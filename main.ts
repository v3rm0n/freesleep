import { App, staticFiles } from "fresh";
import { controlLoop } from "./server/control_loop.ts";
import { define, type State } from "./utils.ts";

export const app = new App<State>();

app.use(staticFiles());

// Request logger.
app.use(
	define.middleware(async (ctx) => {
		const start = performance.now();
		const res = await ctx.next();
		const ms = (performance.now() - start).toFixed(1);
		console.log(`${ctx.req.method} ${ctx.url.pathname} ${res.status} ${ms}ms`);
		return res;
	}),
);

// Include file-system based routes here.
app.fsRoutes();

// Reconcile the expected temperature every minute. Guarded because `vite build`
// evaluates this module without `--unstable-cron`, where `Deno.cron` is absent.
if (typeof Deno.cron === "function") {
	Deno.cron("Control loop", "* * * * *", controlLoop);
}
