/** @jsxRuntime automatic @jsxImportSource hono/jsx */

import { Hono } from "hono";
import api from "./api.ts";

const app = new Hono();

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
				{!import.meta.env || import.meta.env.PROD ? (
          <script type='module' src='/client.js'></script>
        ) : (
          <script type='module' src='/src/client/app.tsx'></script>
        )}
			</head>
			<body>
				<div id="root" />
			</body>
		</html>,
	);
});

export default app;
