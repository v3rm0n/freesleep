import * as z from "zod/v4";
import type { SessionId } from "./session.ts";

export const Credentials = z.object({
	username: z.email(),
	password: z.string(),
});

export type Credentials = z.infer<typeof Credentials>;

export const storeCredentials = async (
	credentials: Credentials,
	id: SessionId,
): Promise<SessionId> => {
	const db = await Deno.openKv();
	await db.set(["credentials", id], credentials);
	return id;
};

export const hasCredentials = async (id: SessionId) => {
	const db = await Deno.openKv();
	const { value } = await db.get<Credentials>(["credentials", id]);
	return value !== null;
};

export const getCredentials = async (id: SessionId) => {
	const db = await Deno.openKv();
	const { value } = await db.get<Credentials>(["credentials", id]);
	return Credentials.parse(value);
};

export const removeCredentials = async (id: SessionId) => {
	const db = await Deno.openKv();
	await db.delete(["credentials", id]);
};

export const allCredentials = async () => {
	const db = await Deno.openKv();
	return db.list<Credentials>({ prefix: ["credentials"] });
};
