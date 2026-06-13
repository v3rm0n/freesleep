import { authenticate } from "../../../server/auth.ts";
import { define } from "../../../utils.ts";

export const handler = define.handlers({
	async GET(ctx) {
		const token = await authenticate(ctx.req);
		if (!token) {
			return new Response("Unauthorized", { status: 401 });
		}
		return Response.json({ authenticated: true });
	},
});
