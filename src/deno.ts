import { Hono } from "hono";
import { serveStatic } from "hono/deno";
import { logger } from "hono/logger";
import { controlLoop } from "./control_loop.ts";
import index from "./index.tsx";

const app = new Hono();

app.use(logger());

app.get("*", serveStatic({ root: "./dist" }));

app.route("/", index);

Deno.serve(app.fetch);

Deno.cron("Control loop", "* * * * *", controlLoop);
