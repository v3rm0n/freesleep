import { authenticate } from "../../../server/auth.ts";
import { getExpectedState } from "../../../server/state.ts";
import { define } from "../../../utils.ts";

export const handler = define.handlers({
	async GET(ctx) {
		const token = await authenticate(ctx.req);
		if (!token) {
			return new Response("Unauthorized", { status: 401 });
		}
		const state = await getExpectedState(token);
		return Response.json(state);
	},
});
