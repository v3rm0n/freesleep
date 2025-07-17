import * as z from "zod/v4";
import { type Credentials, removeCredentials } from "./credentials.ts";
import { removeAccessToken } from "./eightsleep_api/access_token.ts";

export const SessionId = z.uuid();

export type SessionId = z.infer<typeof SessionId>;

export const createSession = async (
	credentials: Credentials,
): Promise<SessionId> => {
	const db = await Deno.openKv();
	const id = SessionId.parse(crypto.randomUUID());
	const { value: existingId } = await db.get<SessionId>([
		"sessions",
		credentials.username,
	]);
	if (existingId) {
		console.log(
			`Existing session found for ${credentials.username}, deleting...`,
		);
		await removeSession(credentials.username, existingId);
	}
	await db.set(["sessions", credentials.username], id);
	return id;
};

export const removeSession = async (username: string, id: SessionId) => {
	await removeCredentials(id);
	const db = await Deno.openKv();
	await db.delete(["sessions", username]);
	await removeAccessToken(id);
};
