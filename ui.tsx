import { Hono } from "hono";
import { serveStatic } from "hono/deno";
import { App } from "./ui/app.tsx";

const app = new Hono();

app.get("/", (c) => {
	return c.html(<App />);
});

app.use("*", serveStatic({ root: "./static" }));

export default app;
