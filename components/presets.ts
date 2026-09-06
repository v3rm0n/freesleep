import { temperatureToHeatingLevel } from "../server/temperature.ts";
import type { Schedule, Temperature } from "./Graph.tsx";

/** A built-in night curve that can be loaded into a side with one click. */
export interface Preset {
	/** Stable identifier, e.g. "cold". */
	id: string;
	/** Short name shown on the chip. */
	name: string;
	/** Who the preset suits; shown as the chip's tooltip. */
	description: string;
	schedule: Schedule;
}

/**
 * Three starting points from cold to neutral, in °C. Every preset shares the
 * same six times (evening to morning, 2 h apart), so loading one over another
 * animates the handles instead of remounting the graph.
 *
 * They all follow the night shape sleep research and Eight Sleep's own guidance
 * agree on: warm at bedtime (warm skin speeds up falling asleep), cooler through
 * the first half of the night while core temperature falls, back to the bedtime
 * temperature as it bottoms out around 3–5 AM, and warmer towards wake-up. The
 * step is about one notch on Eight Sleep's dial. Fine-tuning is done by
 * dragging the handles.
 */
export const PRESETS: readonly Preset[] = [
	{
		id: "cold",
		name: "Cold",
		description: "For hot sleepers and warm bedrooms.",
		schedule: [
			["22:00", 17.5],
			["00:00", 16.5],
			["02:00", 16],
			["04:00", 16],
			["06:00", 17.5],
			["08:00", 19],
		],
	},
	{
		id: "cool",
		name: "Cool",
		description: "For people who run a little warm.",
		schedule: [
			["22:00", 22],
			["00:00", 21],
			["02:00", 20.5],
			["04:00", 20.5],
			["06:00", 22],
			["08:00", 23.5],
		],
	},
	{
		id: "neutral",
		name: "Neutral",
		description: "Eight Sleep's suggested starting point.",
		// Bedtime is 27.5 rather than 27: exactly 27 °C is heating level 0, which
		// the control loop reads as a switched-off pod (see server/control_loop.ts).
		schedule: [
			["22:00", 27.5],
			["00:00", 26.5],
			["02:00", 26],
			["04:00", 26],
			["06:00", 27.5],
			["08:00", 29],
		],
	},
];

/** The curve shown for a side that has no saved schedule yet. */
export const DEFAULT_SCHEDULE: Schedule = PRESETS[0].schedule;

/** The coldest and warmest temperature in a schedule. */
export const temperatureRange = (
	schedule: Schedule,
): { min: Temperature; max: Temperature } => {
	const temperatures = schedule.map(([, temperature]) => temperature);
	return { min: Math.min(...temperatures), max: Math.max(...temperatures) };
};

// Points are compared by the heating level they are sent to the pod as: a
// saved 0.5 °C step can come back as e.g. 25.56 °C, so degrees would stop
// matching after a reload.
const sameSchedule = (a: Schedule, b: Schedule): boolean =>
	a.length === b.length &&
	a.every(
		([time, temperature], i) =>
			time === b[i][0] &&
			temperatureToHeatingLevel(temperature) ===
				temperatureToHeatingLevel(b[i][1]),
	);

/** The preset `schedule` still is, or null once it has been edited. */
export const matchingPreset = (schedule: Schedule): Preset | null =>
	PRESETS.find((preset) => sameSchedule(preset.schedule, schedule)) ?? null;
