import { authenticate } from "../../server/auth.ts";
import { resolveAccessToken } from "../../server/eightsleep_api/access_token.ts";
import { getCurrentState } from "../../server/state.ts";
import { define } from "../../utils.ts";

export const handler = define.handlers({
	async GET(ctx) {
		const token = await authenticate(ctx.req);
		if (!token) {
			return new Response("Unauthorized", { status: 401 });
		}
		const state = await getCurrentState(await resolveAccessToken(token));
		return Response.json(state);
	},
});
