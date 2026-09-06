import { type Credentials, getCredentials } from "../credentials.ts";
import { openKv } from "../kv.ts";
import type { SessionId } from "../session.ts";
import * as http from "./http.ts";
import type { AccessToken } from "./model/index.ts";

const CLIENT_ID = "0894c7f33bb94800a03f1f4df13a4f38";
const CLIENT_SECRET =
	"f0954a3ed5763ba3d06834c73731a32f15f168f47d4f164751275def86db0c76";

// Refresh this long before the token expires so requests already in flight
// don't race the deadline.
const EXPIRY_MARGIN_MS = 60_000;

export const accessTokenKey = (id: SessionId): Deno.KvKey => [
	"accessToken",
	id,
];

const getAccessToken = async (id: SessionId): Promise<AccessToken | null> => {
	const db = await openKv();
	const { value } = await db.get<AccessToken>(accessTokenKey(id));
	return value;
};

const storeAccessToken = async (id: SessionId, accessToken: AccessToken) => {
	const db = await openKv();
	await db.set(accessTokenKey(id), accessToken);
};

const isExpired = (accessToken: AccessToken) =>
	Date.now() + EXPIRY_MARGIN_MS >= accessToken.expires_at;

/**
 * Exchanges Eight Sleep credentials for an access token. Throws
 * `EightSleepApiError` (status 401) when Eight Sleep rejects them.
 */
export const requestAccessToken = (
	credentials: Credentials,
): Promise<AccessToken> =>
	http.login({
		client_id: CLIENT_ID,
		client_secret: CLIENT_SECRET,
		grant_type: "password",
		username: credentials.username,
		password: credentials.password,
	});

/**
 * Returns a valid access token for the session, logging in again with the
 * stored credentials when the cached token is missing or about to expire.
 */
export const resolveAccessToken = async (
	id: SessionId,
): Promise<AccessToken> => {
	const cached = await getAccessToken(id);
	if (cached && !isExpired(cached)) {
		return cached;
	}
	const credentials = await getCredentials(id);
	if (!credentials) {
		throw new Error(`No credentials stored for session ${id}`);
	}
	const accessToken = await requestAccessToken(credentials);
	await storeAccessToken(id, accessToken);
	return accessToken;
};
