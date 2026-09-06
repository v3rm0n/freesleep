import * as z from "zod/v4";
import { openKv } from "./kv.ts";
import type { SessionId } from "./session.ts";

export const Credentials = z.object({
	username: z.email(),
	password: z.string(),
});

export type Credentials = z.infer<typeof Credentials>;

export const credentialsKey = (id: SessionId): Deno.KvKey => [
	"credentials",
	id,
];

export const getCredentials = async (
	id: SessionId,
): Promise<Credentials | null> => {
	const db = await openKv();
	const { value } = await db.get(credentialsKey(id));
	return value === null ? null : Credentials.parse(value);
};

export const hasCredentials = async (id: SessionId): Promise<boolean> =>
	(await getCredentials(id)) !== null;

/** Every stored credential; the session id is the last part of each key. */
export const allCredentials = async () => {
	const db = await openKv();
	return db.list<Credentials>({ prefix: ["credentials"] });
};
