import { zValidator } from "@hono/zod-validator";
import { Credentials, setCredentials, getCredentials } from "./api/api.ts";
import { Hono } from "hono";
import { controlLoop } from "./control_loop.ts";

const app = new Hono();

app.post("/login", zValidator("json", Credentials), async (c) => {
	const data = c.req.valid("json");
	await setCredentials(data);
	return c.json({
		success: true,
		message: "Logged in",
	});
});

app.get("/", async (c) => {
	const credentials = await getCredentials();
	if (credentials) {
		return c.text(`Logged in ${credentials.username}`);
	}
	return c.text("Hello, please log in!");
});

Deno.serve(app.fetch);

Deno.cron("Control loop", "* * * * *", controlLoop);
