import * as z from "zod/v4";
import { type Credentials, credentialsKey } from "./credentials.ts";
import { accessTokenKey } from "./eightsleep_api/access_token.ts";
import type { AccessToken } from "./eightsleep_api/model/index.ts";
import { openKv } from "./kv.ts";
import { expectedStateKey } from "./state.ts";

export const SessionId = z.uuid();

export type SessionId = z.infer<typeof SessionId>;

const sessionKey = (username: string): Deno.KvKey => ["sessions", username];

// Retries for optimistic KV transactions that lose against a concurrent write.
const MAX_ATTEMPTS = 5;

/**
 * Creates a session for credentials that Eight Sleep has already accepted.
 *
 * A user has at most one session: an existing session for the same username is
 * replaced and its schedule carried over. Everything is written in a single
 * atomic transaction checked against the username mapping, so a concurrent
 * login or a crash half-way cannot leave credentials behind without a session.
 */
export const createSession = async (
	credentials: Credentials,
	accessToken: AccessToken,
): Promise<SessionId> => {
	const db = await openKv();
	for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
		const id = SessionId.parse(crypto.randomUUID());
		const existing = await db.get<SessionId>(sessionKey(credentials.username));
		const tx = db
			.atomic()
			.check(existing)
			.set(sessionKey(credentials.username), id)
			.set(credentialsKey(id), credentials)
			.set(accessTokenKey(id), accessToken);
		if (existing.value !== null) {
			const previousId = existing.value;
			console.log(`Replacing the existing session for ${credentials.username}`);
			const schedule = await db.get(expectedStateKey(previousId));
			tx.check(schedule);
			if (schedule.value !== null) {
				tx.set(expectedStateKey(id), schedule.value);
			}
			tx.delete(credentialsKey(previousId))
				.delete(accessTokenKey(previousId))
				.delete(expectedStateKey(previousId));
		}
		if ((await tx.commit()).ok) {
			return id;
		}
	}
	throw new Error(
		`Could not create a session for ${credentials.username}: too many concurrent logins`,
	);
};

/**
 * Deletes a session together with its credentials, access token and schedule.
 * The username mapping is only cleared while it still points at this session,
 * so logging out a replaced session cannot log out the one that replaced it.
 */
export const removeSession = async (id: SessionId): Promise<void> => {
	const db = await openKv();
	for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
		const credentials = await db.get<Credentials>(credentialsKey(id));
		const tx = db
			.atomic()
			.check(credentials)
			.delete(credentialsKey(id))
			.delete(accessTokenKey(id))
			.delete(expectedStateKey(id));
		if (credentials.value !== null) {
			const mapping = await db.get<SessionId>(
				sessionKey(credentials.value.username),
			);
			if (mapping.value === id) {
				tx.check(mapping).delete(sessionKey(credentials.value.username));
			}
		}
		if ((await tx.commit()).ok) {
			return;
		}
	}
	throw new Error(
		`Could not remove session ${id}: too many concurrent updates`,
	);
};
