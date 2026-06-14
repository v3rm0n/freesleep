/**
 * Opens the Deno KV store used for sessions, credentials and schedules.
 *
 * On Deno Deploy, `Deno.openKv()` with no path connects to the managed KV
 * database. When self-hosting (e.g. the Docker image), set `DENO_KV_PATH` to a
 * file on a persisted volume so data survives container restarts:
 *
 *   DENO_KV_PATH=/data/kv.sqlite3
 */
export const openKv = (): Promise<Deno.Kv> => {
	const path = Deno.env.get("DENO_KV_PATH");
	return path ? Deno.openKv(path) : Deno.openKv();
};
