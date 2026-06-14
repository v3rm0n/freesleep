/**
 * Opens the Deno KV store used for sessions, credentials and schedules.
 *
 * Set `DENO_KV_PATH` to a file on a persisted volume so data survives restarts
 * (the Docker image presets `DENO_KV_PATH=/data/kv.sqlite3`). With no env var,
 * `Deno.openKv()` falls back to its default on-disk SQLite location.
 */
export const openKv = (): Promise<Deno.Kv> => {
	const path = Deno.env.get("DENO_KV_PATH");
	return path ? Deno.openKv(path) : Deno.openKv();
};
