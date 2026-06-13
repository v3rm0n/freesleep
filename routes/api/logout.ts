import { deleteCookie } from "@std/http/cookie";
import { authenticate } from "../../server/auth.ts";
import { getCredentials } from "../../server/credentials.ts";
import { removeSession } from "../../server/session.ts";
import { removeExpectedState } from "../../server/state.ts";
import { define } from "../../utils.ts";

export const handler = define.handlers({
	async POST(ctx) {
		const token = await authenticate(ctx.req);
		if (!token) {
			return new Response("Unauthorized", { status: 401 });
		}
		const credentials = await getCredentials(token);
		await removeSession(credentials.username, token);
		await removeExpectedState(token);
		const res = Response.json({ success: true });
		deleteCookie(res.headers, "SESSION", { path: "/" });
		return res;
	},
});
