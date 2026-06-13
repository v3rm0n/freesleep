import { setCookie } from "@std/http/cookie";
import { Credentials, storeCredentials } from "../../server/credentials.ts";
import { retrieveAccessToken } from "../../server/eightsleep_api/access_token.ts";
import { createSession, removeSession } from "../../server/session.ts";
import { define } from "../../utils.ts";

export const handler = define.handlers({
	async POST(ctx) {
		const parsed = Credentials.safeParse(
			await ctx.req.json().catch(() => null),
		);
		if (!parsed.success) {
			return Response.json({ message: "Invalid credentials" }, { status: 400 });
		}
		const data = parsed.data;
		const id = await createSession(data);
		const token = await storeCredentials(data, id);
		try {
			await retrieveAccessToken(token, data);
			const res = Response.json({ success: true, token });
			setCookie(res.headers, {
				name: "SESSION",
				value: token,
				httpOnly: true,
				secure: ctx.url.protocol === "https:",
				sameSite: "Strict",
				path: "/",
			});
			return res;
		} catch (e) {
			console.error(e);
			await removeSession(data.username, id);
			return Response.json({ message: `Failed to login: ${e}` });
		}
	},
});
