import * as z from "zod/v4";

export const DaysUTC = z.object({
	sunday: z.boolean(),
	monday: z.boolean(),
	tuesday: z.boolean(),
	wednesday: z.boolean(),
	thursday: z.boolean(),
	friday: z.boolean(),
	saturday: z.boolean(),
});

export const Schedule = z.object({
	daysUTC: DaysUTC,
	enabled: z.boolean(),
});

export const SensorInfo = z.object({
	label: z.string(),
	partNumber: z.string(),
	sku: z.string(),
	hwRevision: z.string(),
	serialNumber: z.string(),
	lastConnected: z.iso.datetime(),
	skuName: z.string(),
	model: z.string(),
	version: z.number(),
	connected: z.boolean(),
});

export const MattressInfo = z.object({
	firstUsedDate: z.iso.datetime().nullable(),
	eightMattress: z.string().nullable(),
	brand: z.string().nullable(),
});

export const WeekDays = z.object({
	monday: z.boolean(),
	tuesday: z.boolean(),
	wednesday: z.boolean(),
	thursday: z.boolean(),
	friday: z.boolean(),
	saturday: z.boolean(),
	sunday: z.boolean(),
});

export const ScheduleProfile = z.object({
	enabled: z.boolean(),
	startLocalTime: z.string(),
	weekDays: WeekDays,
});

export const KelvinSettings = z.object({
	targetLevels: z.array(z.number()),
	alarms: z.array(z.unknown()),
	scheduleProfiles: z.array(ScheduleProfile),
	phases: z.array(z.unknown()),
	level: z.number(),
	currentTargetLevel: z.number(),
	active: z.boolean(),
	currentActivity: z.string(),
});

export const WifiInfo = z.object({
	signalStrength: z.number(),
	ssid: z.string(),
	ipAddr: z.string(),
	macAddr: z.string(),
	asOf: z.iso.datetime(),
});

export const AwaySides = z.object({
	leftUserId: z.string(),
	rightUserId: z.string(),
});

export const Device = z.object({
	deviceId: z.string(),
	ownerId: z.string(),
	leftUserId: z.string(),
	leftHeatingLevel: z.number(),
	leftTargetHeatingLevel: z.number(),
	leftNowHeating: z.boolean(),
	leftHeatingDuration: z.number(),
	leftSchedule: Schedule,
	rightUserId: z.string(),
	rightHeatingLevel: z.number(),
	rightTargetHeatingLevel: z.number(),
	rightNowHeating: z.boolean(),
	rightHeatingDuration: z.number(),
	rightSchedule: Schedule,
	priming: z.boolean(),
	lastLowWater: z.iso.datetime(),
	lastPrime: z.iso.datetime(),
	needsPriming: z.boolean(),
	hasWater: z.boolean(),
	ledBrightnessLevel: z.number(),
	sensorInfo: SensorInfo,
	sensors: z.array(SensorInfo),
	expectedPeripherals: z.unknown().nullable(),
	hubInfo: z.string(),
	timezone: z.string(),
	location: z.tuple([z.number(), z.number()]),
	mattressInfo: MattressInfo,
	firmwareCommit: z.string(),
	firmwareVersion: z.string(),
	firmwareUpdated: z.boolean(),
	firmwareUpdating: z.boolean(),
	lastFirmwareUpdateStart: z.string().datetime({ offset: true }),
	lastHeard: z.iso.datetime(),
	online: z.boolean(),
	encasementType: z.string(),
	leftKelvin: KelvinSettings,
	rightKelvin: KelvinSettings,
	features: z.array(z.string()),
	leftUserInvitationPending: z.boolean(),
	rightUserInvitationPending: z.boolean(),
	modelString: z.string(),
	hubSerial: z.string(),
	wifiInfo: WifiInfo,
	awaySides: AwaySides,
	isTemperatureAvailable: z.boolean(),
	deactivated: z.object({}),
});

export const DeviceResponse = z.object({
	result: Device,
});

export type DeviceResponse = z.infer<typeof DeviceResponse>;

export type Device = z.infer<typeof Device>;
