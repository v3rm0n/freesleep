import { authenticate } from "../../../../server/auth.ts";
import { Side } from "../../../../server/eightsleep_api/model/index.ts";
import {
	ExpectedStateSide,
	setSideExpectedState,
} from "../../../../server/state.ts";
import { define } from "../../../../utils.ts";

export const handler = define.handlers({
	async POST(ctx) {
		const token = await authenticate(ctx.req);
		if (!token) {
			return new Response("Unauthorized", { status: 401 });
		}
		const side = Side.safeParse(ctx.params.side);
		if (!side.success) {
			return Response.json({ message: "Invalid side" }, { status: 400 });
		}
		const parsed = ExpectedStateSide.safeParse(
			await ctx.req.json().catch(() => null),
		);
		if (!parsed.success) {
			return Response.json({ message: "Invalid body" }, { status: 400 });
		}
		await setSideExpectedState(token, side.data, parsed.data);
		return Response.json({ success: true });
	},
});
