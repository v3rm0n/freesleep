import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { Credentials } from "./api.ts";
import { controlLoop } from "./control_loop.ts";

const app = new Hono();

app.post("/login", zValidator("json", Credentials), (c) => {
	const data = c.req.valid("json");
	return c.json({
		success: true,
		message: "Logged in",
	});
});

app.get("/", (c) => {
	return c.text("Hello Hono!");
});

Deno.serve(app.fetch);

Deno.cron("Control loop", "* * * * *", controlLoop);
