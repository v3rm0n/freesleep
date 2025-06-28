import * as z from "zod/v4";
import * as http from "./http.ts";
import type { AccessToken } from "./model/index.ts";

const CLIENT_ID = "0894c7f33bb94800a03f1f4df13a4f38";
const CLIENT_SECRET =
	"f0954a3ed5763ba3d06834c73731a32f15f168f47d4f164751275def86db0c76";

export const Credentials = z
	.object({
		username: z.email(),
		password: z.string(),
	})
	.nullable();

export type Credentials = z.infer<typeof Credentials>;

export const setCredentials = async (
	credentials: z.infer<typeof Credentials>,
) => {
	const db = await Deno.openKv();
	await db.set(["credentials"], credentials);
};

export const hasCredentials = async () => {
	const db = await Deno.openKv();
	const { value } = await db.get(["credentials"]);
	return value !== null;
};

export const getCredentials = async () => {
	const db = await Deno.openKv();
	const { value } = await db.get(["credentials"]);
	return value as z.infer<typeof Credentials>;
};

const setAccessToken = async (accessToken: AccessToken) => {
	const db = await Deno.openKv();
	await db.set(["accessToken"], accessToken);
};

const getAccessToken = async () => {
	const db = await Deno.openKv();
	const { value } = await db.get(["accessToken"]);
	return value as AccessToken;
};

const isExpired = (accessToken: AccessToken) => {
	const now = Date.now();
	return now > accessToken.expires_in;
};

export const getTemperature = async () => {
	let accessToken = await getAccessToken();
	if (!accessToken || isExpired(accessToken)) {
		const credentials = await getCredentials();
		if (!credentials) {
			return Promise.reject("No credentials found");
		}
		accessToken = await http.login({
			client_id: CLIENT_ID,
			client_secret: CLIENT_SECRET,
			grant_type: "password",
			username: credentials.username,
			password: credentials.password,
		});
		await setAccessToken(accessToken);
	}
	return await http.temperature(accessToken.userId, accessToken);
};
