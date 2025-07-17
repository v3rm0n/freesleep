import * as z from "zod/v4";

export const NotificationSettings = z.object({
	weeklyReportEmail: z.boolean(),
	sessionProcessed: z.boolean(),
	temperatureRecommendation: z.boolean(),
	healthInsight: z.boolean(),
	sleepInsight: z.boolean(),
	marketingUpdates: z.boolean(),
	bedtimeReminder: z.boolean(),
	alarmWakeupPush: z.boolean(),
});

export const DisplaySettings = z.object({
	useRealTemperatures: z.boolean(),
	measurementSystem: z.enum(["metric", "imperial"]),
});

export const SleepTracking = z.object({
	enabledSince: z.iso.datetime(),
});

export const CurrentDevice = z.object({
	id: z.string(),
	side: z.enum(["left", "right"]),
	timeZone: z.string(),
	specialization: z.string(),
});

export type CurrentDevice = z.infer<typeof CurrentDevice>;

export const User = z.object({
	userId: z.string(),
	email: z.email(),
	firstName: z.string(),
	lastName: z.string(),
	gender: z.enum(["male", "female", "other"]),
	dob: z.iso.datetime(),
	zip: z.number(),
	emailVerified: z.boolean(),
	sharingMetricsTo: z.array(z.string()),
	sharingMetricsFrom: z.array(z.string()),
	notifications: NotificationSettings,
	displaySettings: DisplaySettings,
	createdAt: z.iso.datetime(),
	experimentalFeatures: z.boolean(),
	autopilotEnabled: z.boolean(),
	lastReset: z.iso.datetime(),
	nextReset: z.iso.datetime(),
	sleepTracking: SleepTracking,
	features: z.array(z.string()),
	currentDevice: CurrentDevice,
	tempPreferenceUpdatedAt: z.iso.datetime(),
	hotelGuest: z.boolean(),
	devices: z.array(z.string()),
});

export const UserResponse = z.object({
	user: User,
});

export type UserResponse = z.infer<typeof UserResponse>;

export type User = z.infer<typeof User>;
