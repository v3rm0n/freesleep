import { Hono } from "hono";
import { serveStatic } from "hono/deno";
import { logger } from "hono/logger";
import api from "./api.ts";
import { controlLoop } from "./control_loop.ts";

const app = new Hono();

app.use(logger());

app.get("/client.js", serveStatic({ path: "./dist/client.js" }));
app.get("*", serveStatic({ root: "./static" }));

app.route("/", api);

app.get("/", (c) => {
	return c.html(
		<html lang="en">
			<head>
				<meta charSet="utf-8" />
				<meta content="width=device-width, initial-scale=1" name="viewport" />
				<link
					href="https://fonts.cdnfonts.com/css/sf-pro-display"
					rel="stylesheet"
				/>
				<link rel="stylesheet" href="style.css" />
				<title>FreeSleep</title>
				<script type="module" src="/client.js" />
			</head>
			<body>
				<div id="root" />
			</body>
		</html>,
	);
});

Deno.serve(app.fetch);

Deno.cron("Control loop", "* * * * *", controlLoop);
