import type { Schedule, Time } from "./Graph.tsx";

/**
 * The night axis a schedule lives on.
 *
 * A schedule runs from its first point (bedtime) to its last (wake-up) and
 * repeats every day, so a point's place in the night is how many minutes it
 * comes after bedtime, wrapping past midnight. Nothing here assumes the night
 * is at night: a day sleeper's 09:00–17:00 works the same way.
 */

export const MINUTES_PER_DAY = 24 * 60;

/** Points moved by stretching a curve land on this step, keeping labels tidy. */
export const NIGHT_STEP_MINUTES = 5;

/** The shortest night the UI accepts. */
export const MIN_NIGHT_MINUTES = 60;

const pad2 = (n: number) => n.toString().padStart(2, "0");

/** Minutes past midnight of a "HH:MM" time. */
export const minutesOfDay = (time: Time): number => {
	const [hours, minutes] = time.split(":").map(Number);
	return hours * 60 + minutes;
};

/** "HH:MM" for minutes past midnight, wrapping around the day. */
export const minutesToTime = (minutes: number): Time => {
	const wrapped =
		((Math.round(minutes) % MINUTES_PER_DAY) + MINUTES_PER_DAY) %
		MINUTES_PER_DAY;
	return `${pad2(Math.floor(wrapped / 60))}:${pad2(wrapped % 60)}`;
};

/** Formats a date's local wall-clock time as "HH:MM". */
export const formatTime = (date: Date): Time =>
	`${pad2(date.getHours())}:${pad2(date.getMinutes())}`;

/**
 * Minutes from `start` to `time` (0…1439), wrapping past midnight. This is the
 * order a night's points come in.
 */
export const minutesAfter = (start: Time, time: Time): number =>
	(minutesOfDay(time) - minutesOfDay(start) + MINUTES_PER_DAY) %
	MINUTES_PER_DAY;

export interface Night {
	/** Bedtime: the first point. */
	start: Time;
	/** Wake-up: the last point. */
	end: Time;
	/** How long the night lasts. */
	minutes: number;
}

/** The night a (non-empty) schedule spans. */
export const nightOf = (schedule: Schedule): Night => {
	const start = schedule[0][0];
	const end = schedule[schedule.length - 1][0];
	return { start, end, minutes: minutesAfter(start, end) };
};

/**
 * Stretches (or squeezes) a schedule so it runs from `start` to `end`. The
 * ends move to the new times; every point in between keeps its relative place
 * in the night, rounded to `NIGHT_STEP_MINUTES` without overtaking its
 * neighbours. The temperatures are untouched, so the curve keeps its shape.
 */
export const fitToNight = (
	schedule: Schedule,
	start: Time,
	end: Time,
): Schedule => {
	const count = schedule.length;
	if (count === 0) {
		return schedule;
	}
	const from = nightOf(schedule);
	if (from.start === start && from.end === end) {
		return schedule;
	}
	if (count === 1) {
		return [[start, schedule[0][1]]];
	}
	const length = minutesAfter(start, end);
	// Minutes past midnight of the new bedtime. Later points count on from it
	// (past 24:00 when the night crosses midnight) and wrap when formatted.
	const origin = minutesOfDay(start);
	const offsets = [0];
	for (let i = 1; i < count - 1; i++) {
		const fraction =
			from.minutes === 0
				? 0
				: minutesAfter(from.start, schedule[i][0]) / from.minutes;
		const rounded =
			Math.round((origin + fraction * length) / NIGHT_STEP_MINUTES) *
				NIGHT_STEP_MINUTES -
			origin;
		// Stay strictly after the previous point and leave a minute for each
		// point still to come.
		const earliest = offsets[i - 1] + 1;
		const latest = length - (count - 1 - i);
		offsets.push(Math.min(Math.max(rounded, earliest), latest));
	}
	offsets.push(length);
	return schedule.map(([, temperature], i) => [
		minutesToTime(origin + offsets[i]),
		temperature,
	]);
};

/** The length of a night for display, e.g. "10 h" or "9 h 30 min". */
export const formatNightLength = (minutes: number): string => {
	const hours = Math.floor(minutes / 60);
	const rest = minutes % 60;
	if (hours === 0) {
		return `${rest} min`;
	}
	return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
};

/**
 * A schedule point as the ISO timestamp the API stores: `time` on `today`'s
 * date, or on the next day for the part of the night after midnight (a time
 * earlier in the day than the night's `start`). The server only compares the
 * time of day (see server/schedule.ts); the dates just keep the night in order.
 */
export const toISODateTime = (
	time: Time,
	start: Time,
	today: Date = new Date(),
): string => {
	const date = new Date(today);
	const minutes = minutesOfDay(time);
	date.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
	if (minutes < minutesOfDay(start)) {
		date.setDate(date.getDate() + 1);
	}
	return date.toISOString();
};
