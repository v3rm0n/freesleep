import type { HeatingState } from "./state.ts";

const MINUTES_PER_DAY = 24 * 60;

const minuteOfDay = (date: Date): number =>
	date.getUTCHours() * 60 + date.getUTCMinutes();

/**
 * Picks the schedule point that applies at `now`, or `null` when the schedule
 * is not active.
 *
 * The UI saves each point as an ISO timestamp anchored to the day the curve was
 * drawn, but a schedule describes every night, so only the time of day is
 * compared here (in UTC, the clock the timestamps are stored in). The schedule
 * is active from its first point to its last one, in the order the points were
 * saved (a typical night crosses midnight); inside that window the most recent
 * point applies, outside it the pod is left alone.
 *
 * The time of day is fixed when the curve is saved, so a daylight-saving change
 * shifts the schedule by an hour until the curve is next edited.
 */
export const activeHeatingState = (
	levels: readonly HeatingState[],
	now: Date,
): HeatingState | null => {
	if (levels.length === 0) {
		return null;
	}
	const ordered = [...levels].sort(
		(a, b) => Date.parse(a.time) - Date.parse(b.time),
	);
	const start = minuteOfDay(new Date(ordered[0].time));
	// Minutes since the schedule started, wrapping around midnight.
	const sinceStart = (date: Date) =>
		(minuteOfDay(date) - start + MINUTES_PER_DAY) % MINUTES_PER_DAY;
	const elapsed = sinceStart(now);
	if (elapsed > sinceStart(new Date(ordered[ordered.length - 1].time))) {
		return null;
	}
	let active: HeatingState | null = null;
	for (const level of ordered) {
		if (sinceStart(new Date(level.time)) > elapsed) {
			break;
		}
		active = level;
	}
	return active;
};
