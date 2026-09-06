import {
	heatingLevelToTemperatureMap,
	maximumTemperature,
	minimumTemperature,
} from "./constants.ts";

interface Mapping {
	level: number;
	temperature: number;
}

// Temperature grows with level, so one ascending table serves both directions.
const mappings: Mapping[] = Object.entries(heatingLevelToTemperatureMap)
	.map(([level, temperature]) => ({ level: Number(level), temperature }))
	.sort((a, b) => a.level - b.level);

// Linear interpolation of `to` between the two table entries bracketing
// `value` on the `from` axis, clamped to the table's ends.
const interpolate = (
	from: keyof Mapping,
	to: keyof Mapping,
	value: number,
): number => {
	const first = mappings[0];
	const last = mappings[mappings.length - 1];
	if (value <= first[from]) {
		return first[to];
	}
	if (value >= last[from]) {
		return last[to];
	}
	for (let i = 0; i < mappings.length - 1; i++) {
		const lower = mappings[i];
		const upper = mappings[i + 1];
		if (value >= lower[from] && value <= upper[from]) {
			if (upper[from] === lower[from]) {
				return lower[to];
			}
			const ratio = (value - lower[from]) / (upper[from] - lower[from]);
			return lower[to] + ratio * (upper[to] - lower[to]);
		}
	}
	return last[to];
};

/** Converts an Eight Sleep heating level (-100…100) to degrees Celsius. */
export const heatingLevelToTemperature = (level: number): number =>
	interpolate("level", "temperature", level);

/** Converts degrees Celsius to the nearest Eight Sleep heating level. */
export const temperatureToHeatingLevel = (temperature: number): number => {
	const clamped = Math.max(
		minimumTemperature,
		Math.min(maximumTemperature, temperature),
	);
	return Math.round(interpolate("temperature", "level", clamped));
};
