let kv: Promise<Deno.Kv> | undefined;

/**
 * Opens the Deno KV store used for sessions, credentials and schedules.
 *
 * The handle is opened once and shared. Every `Deno.openKv()` call creates a
 * new SQLite connection (with its own worker thread and file descriptors) that
 * is only released by `close()`, so opening per call would leak on every
 * request and every control-loop tick.
 *
 * Set `DENO_KV_PATH` to a file on a persisted volume so data survives restarts
 * (the Docker image presets `DENO_KV_PATH=/data/kv.sqlite3`). With no env var,
 * `Deno.openKv()` falls back to its default on-disk SQLite location.
 */
export const openKv = (): Promise<Deno.Kv> => {
	if (!kv) {
		const path = Deno.env.get("DENO_KV_PATH");
		kv = path ? Deno.openKv(path) : Deno.openKv();
		// Let the next caller retry if opening failed.
		kv.catch(() => {
			kv = undefined;
		});
	}
	return kv;
};
