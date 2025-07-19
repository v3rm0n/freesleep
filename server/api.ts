import { zValidator } from "@hono/zod-validator";
import { type Context, Hono, type MiddlewareHandler, type Next } from "hono";
import { bearerAuth } from "hono/bearer-auth";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import {
	Credentials,
	getCredentials,
	hasCredentials,
	storeCredentials,
} from "./credentials.ts";
import { retrieveAccessToken } from "./eightsleep_api/access_token.ts";
import { createSession, removeSession, SessionId } from "./session.ts";
import {
	ExpectedState,
	getCurrentHeatingState,
	getExpectedState,
	removeExpectedState,
	setExpectedState,
} from "./state.ts";

type Variables = { bearerToken: SessionId };
const app = new Hono<{ Variables: Variables }>();

const authenticated: MiddlewareHandler = async (
	c: Context,
	next: Next,
	//biome-ignore lint/suspicious/noConfusingVoidType: This is necessary
): Promise<Response | void> => {
	const session = getCookie(c, "SESSION");
	if (session) {
		c.set("bearerToken", session);
		if (await hasCredentials(SessionId.parse(session))) {
			return next();
		}
		return new Response("Session cookie is not valid!");
	}
	return bearerAuth({
		verifyToken: async (token, c) => {
			c.set("bearerToken", token);
			return await hasCredentials(SessionId.parse(token));
		},
	})(c, next);
};

const routes = app
	.post("/login", zValidator("json", Credentials), async (c) => {
		const data = c.req.valid("json");
		const id = await createSession(data);
		const token = await storeCredentials(data, id);
		try {
			await retrieveAccessToken(token, data);
			setCookie(c, "SESSION", token, {
				httpOnly: true,
				secure: !import.meta.env || import.meta.env.PROD,
				sameSite: "strict",
			});
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
		await removeExpectedState(bearerToken);
		deleteCookie(c, "SESSION");
		return c.json({ success: true });
	})

	.get("/auth/check", authenticated, async (c) => {
		return c.json({ authenticated: true });
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
