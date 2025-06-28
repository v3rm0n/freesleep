import * as z from "zod/v4";

export const Bedtime = z.object({
	time: z.string(),
	dayOffset: z.enum(["Zero", "One", "MinusOne"]),
});

export const Routine = z.object({
	id: z.uuid(),
	alarms: z.array(z.unknown()),
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
	enabled: z.boolean(),
	bedtime: Bedtime,
});

export const RoutineSettings = z.object({
	routines: z.array(Routine),
	oneOffAlarms: z.array(z.unknown()),
});

export const RoutineState = z.object({
	status: z.string(),
	upcomingRoutineId: z.uuid(),
});

export const Routines = z.object({
	settings: RoutineSettings,
	state: RoutineState,
});

export type Routines = z.infer<typeof Routines>;
