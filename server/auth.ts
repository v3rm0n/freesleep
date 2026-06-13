import { getCookies } from "@std/http/cookie";
import { hasCredentials } from "./credentials.ts";
import { SessionId } from "./session.ts";

/**
 * Resolves the authenticated session for a request. Accepts either a `SESSION`
 * cookie or an `Authorization: Bearer <token>` header. Returns the validated
 * SessionId, or `null` when no valid session is present.
 */
export const authenticate = async (req: Request): Promise<SessionId | null> => {
	const cookies = getCookies(req.headers);
	let token: string | undefined = cookies.SESSION;
	if (!token) {
		const header = req.headers.get("Authorization");
		if (header?.startsWith("Bearer ")) {
			token = header.slice("Bearer ".length);
		}
	}
	if (!token) {
		return null;
	}
	const parsed = SessionId.safeParse(token);
	if (!parsed.success) {
		return null;
	}
	if (await hasCredentials(parsed.data)) {
		return parsed.data;
	}
	return null;
};
