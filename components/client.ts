import type { Side } from "../server/eightsleep_api/model/index.ts";
import type { ExpectedStateSide } from "../server/state.ts";

const JSON_HEADERS = { "Content-Type": "application/json" };

/**
 * Typed wrapper around the FreeSleep JSON API. Replaces the Hono RPC client
 * (`hc<AppType>`). Response shapes are annotated at the call sites using the
 * exported types from `server/state.ts`.
 */
export const api = {
	getState: (): Promise<Response> =>
		fetch("/api/state", { headers: { Accept: "application/json" } }),

	getExpectedState: (): Promise<Response> =>
		fetch("/api/state/expected", { headers: { Accept: "application/json" } }),

	setExpectedState: (side: Side, body: ExpectedStateSide): Promise<Response> =>
		fetch(`/api/state/expected/${side}`, {
			method: "POST",
			headers: JSON_HEADERS,
			body: JSON.stringify(body),
		}),

	login: (body: { username: string; password: string }): Promise<Response> =>
		fetch("/api/login", {
			method: "POST",
			headers: JSON_HEADERS,
			body: JSON.stringify(body),
		}),

	logout: (): Promise<Response> => fetch("/api/logout", { method: "POST" }),
};
