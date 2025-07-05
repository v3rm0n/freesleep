import { type Credentials, getCredentials } from "../credentials.ts";
import type { SessionId } from "../session.ts";
import * as http from "./http.ts";
import type { AccessToken } from "./model/index.ts";

const CLIENT_ID = "0894c7f33bb94800a03f1f4df13a4f38";
const CLIENT_SECRET =
	"f0954a3ed5763ba3d06834c73731a32f15f168f47d4f164751275def86db0c76";

const storeAccessToken = async (id: SessionId, accessToken: AccessToken) => {
	const db = await Deno.openKv();
	await db.set(["accessToken", id], accessToken);
};

const getAccessToken = async (id: SessionId) => {
	const db = await Deno.openKv();
	const { value } = await db.get<AccessToken>(["accessToken", id]);
	return value;
};

export const removeAccessToken = async (id: SessionId) => {
	const db = await Deno.openKv();
	await db.delete(["accessToken", id]);
};

const isExpired = (accessToken: AccessToken) => {
	const now = Date.now();
	return now > accessToken.expires_at;
};

export const retrieveAccessToken = async (
	id: SessionId,
	credentials: Credentials,
) => {
	const accessToken = await http.login({
		client_id: CLIENT_ID,
		client_secret: CLIENT_SECRET,
		grant_type: "password",
		username: credentials.username,
		password: credentials.password,
	});
	await storeAccessToken(id, accessToken);
	return accessToken;
};

export const resolveAccessToken = async (id: SessionId) => {
	const accessToken = await getAccessToken(id);
	if (!accessToken || isExpired(accessToken)) {
		const credentials = await getCredentials(id);
		if (!credentials) {
			return Promise.reject("No credentials found");
		}
		return retrieveAccessToken(id, credentials);
	}
	return accessToken;
};
