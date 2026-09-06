import { deleteCookie } from "@std/http/cookie";
import { authenticate } from "../../server/auth.ts";
import { removeSession } from "../../server/session.ts";
import { define } from "../../utils.ts";

export const handler = define.handlers({
	async POST(ctx) {
		const token = await authenticate(ctx.req);
		if (!token) {
			return new Response("Unauthorized", { status: 401 });
		}
		await removeSession(token);
		const res = Response.json({ success: true });
		deleteCookie(res.headers, "SESSION", { path: "/" });
		return res;
	},
});
