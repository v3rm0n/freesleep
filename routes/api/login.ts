import { setCookie } from "@std/http/cookie";
import { Credentials } from "../../server/credentials.ts";
import { requestAccessToken } from "../../server/eightsleep_api/access_token.ts";
import { EightSleepApiError } from "../../server/eightsleep_api/http.ts";
import type { AccessToken } from "../../server/eightsleep_api/model/index.ts";
import { createSession } from "../../server/session.ts";
import { define } from "../../utils.ts";

// Eight Sleep statuses that mean the credentials themselves were rejected.
const REJECTED_STATUSES = new Set([400, 401, 403]);

export const handler = define.handlers({
	async POST(ctx) {
		const parsed = Credentials.safeParse(
			await ctx.req.json().catch(() => null),
		);
		if (!parsed.success) {
			return Response.json({ message: "Invalid credentials" }, { status: 400 });
		}
		const credentials = parsed.data;

		// Verify with Eight Sleep first: nothing is stored, and no existing
		// session is replaced, until the password is known to be right.
		let accessToken: AccessToken;
		try {
			accessToken = await requestAccessToken(credentials);
		} catch (error) {
			console.error(`Login failed for ${credentials.username}:`, error);
			if (
				error instanceof EightSleepApiError &&
				REJECTED_STATUSES.has(error.status)
			) {
				return Response.json(
					{ message: "Eight Sleep rejected these credentials" },
					{ status: 401 },
				);
			}
			return Response.json(
				{ message: "Could not reach Eight Sleep, please try again later" },
				{ status: 502 },
			);
		}

		const token = await createSession(credentials, accessToken);
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
	},
});
