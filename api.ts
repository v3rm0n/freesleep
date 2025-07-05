import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { bearerAuth } from "hono/bearer-auth";
import { retrieveAccessToken } from "./api/access_token.ts";
import {
	Credentials,
	getCredentials,
	hasCredentials,
	storeCredentials,
} from "./credentials.ts";
import { createSession, removeSession, SessionId } from "./session.ts";
import {
	ExpectedState,
	getCurrentHeatingState,
	getExpectedState,
	setExpectedState,
} from "./state.ts";

type Variables = { bearerToken: SessionId };
const app = new Hono<{ Variables: Variables }>();

const authenticated = bearerAuth({
	verifyToken: async (token, c) => {
		c.set("bearerToken", token);
		return await hasCredentials(SessionId.parse(token));
	},
});

const routes = app
	.post("/login", zValidator("json", Credentials), async (c) => {
		const data = c.req.valid("json");
		const id = await createSession(data);
		const token = await storeCredentials(data, id);
		try {
			await retrieveAccessToken(token, data);
			return c.json({
				success: true,
				token,
			});
		} catch (e) {
			console.error(e);
			await removeSession(data.username, id);
			return c.json({
				message: `Failed to login: ${e}`,
			});
		}
	})

	.post("/logout", authenticated, async (c) => {
		const bearerToken = c.get("bearerToken");
		const credentials = await getCredentials(bearerToken);
		await removeSession(credentials.username, bearerToken);
		return c.json({ success: true });
	})

	.get("/state/expected", authenticated, async (c) => {
		const bearerToken = c.get("bearerToken");
		const state = await getExpectedState(bearerToken);
		return c.json(state);
	})

	.post(
		"/state/expected",
		authenticated,
		zValidator("json", ExpectedState),
		async (c) => {
			const bearerToken = c.get("bearerToken");
			const data = c.req.valid("json");
			await setExpectedState(bearerToken, data);
			return c.json({ success: true });
		},
	)

	.get("/state/level/current", authenticated, async (c) => {
		const bearerToken = c.get("bearerToken");
		const state = await getCurrentHeatingState(bearerToken);
		return c.json(state);
	});

export default app;

export type AppType = typeof routes;
