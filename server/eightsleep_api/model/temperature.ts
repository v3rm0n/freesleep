import * as z from "zod/v4";

export const HeatingLevel = z.number().min(-100).max(100);

export type HeatingLevel = z.infer<typeof HeatingLevel>;

export const CurrentStateInstance = z.object({
	timestamp: z.iso.datetime(),
});

export const CurrentState = z.object({
	type: z.string(),
	started: z.iso.datetime(),
	until: z.iso.datetime().nullish(),
	instance: CurrentStateInstance.nullish(),
});

export const SmartSettings = z.object({
	bedTimeLevel: HeatingLevel,
	initialSleepLevel: HeatingLevel,
	finalSleepLevel: HeatingLevel,
});

export const TimeBasedSettings = z.object({
	level: HeatingLevel,
	durationSeconds: z.number(),
});

export const ScheduleSettings = z.object({
	id: z.string(),
	enabled: z.boolean(),
	time: z.string(),
	days: z.array(
		z.enum([
			"monday",
			"tuesday",
			"wednesday",
			"thursday",
			"friday",
			"saturday",
			"sunday",
		]),
	),
	tags: z.array(z.string()),
	startSettings: z.object({}),
});

export const NextSchedule = z.object({
	nextTimestamp: z.iso.datetime(),
	id: z.string(),
	enabled: z.boolean(),
	time: z.string(),
	days: z.array(
		z.enum([
			"monday",
			"tuesday",
			"wednesday",
			"thursday",
			"friday",
			"saturday",
			"sunday",
		]),
	),
	tags: z.array(z.string()),
	startSettings: z.object({}),
});

export const NextBedtimeDisplayWindow = z.object({
	displayWindowHours: z.number(),
	nextTimestampInWindow: z.boolean(),
});

export const Temperature = z.object({
	currentLevel: HeatingLevel,
	currentDeviceLevel: HeatingLevel,
	overrideLevels: z.object({}),
	currentState: CurrentState,
	scheduleType: z.enum(["timeBased", "smart"]),
	smart: SmartSettings,
	timeBased: TimeBasedSettings,
	currentSchedule: ScheduleSettings,
	nextSchedule: NextSchedule,
	nextBedtimeDisplayWindow: NextBedtimeDisplayWindow,
});

export type Temperature = z.infer<typeof Temperature>;
