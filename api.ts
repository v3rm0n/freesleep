import * as z from "zod/v4";

export const Credentials = z.object({
	username: z.string().email(),
	password: z.string(),
});

export type Credentials = z.infer<typeof Credentials>;

export const AccessToken = z.object({
    access_token: z.string(),
    token_type: z.string(),
    expires_in: z.number(),
    refresh_token:z.string(),
    userId: z.string()
});

export type AccessToken = z.infer<typeof AccessToken>;

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
    enabledSince: z.string().datetime(),
});

export const CurrentDevice = z.object({
    id: z.string(),
    side: z.enum(["left", "right"]),
    timeZone: z.string(),
    specialization: z.string(),
});

export const User = z.object({
    userId: z.string(),
    email: z.string().email(),
    firstName: z.string(),
    lastName: z.string(),
    gender: z.enum(["male", "female", "other"]),
    dob: z.string().datetime(),
    zip: z.number(),
    emailVerified: z.boolean(),
    sharingMetricsTo: z.array(z.string()),
    sharingMetricsFrom: z.array(z.string()),
    notifications: NotificationSettings,
    displaySettings: DisplaySettings,
    createdAt: z.string().datetime(),
    experimentalFeatures: z.boolean(),
    autopilotEnabled: z.boolean(),
    lastReset: z.string().datetime(),
    nextReset: z.string().datetime(),
    sleepTracking: SleepTracking,
    features: z.array(z.string()),
    currentDevice: CurrentDevice,
    tempPreferenceUpdatedAt: z.string().datetime(),
    hotelGuest: z.boolean(),
    devices: z.array(z.string()),
});

export const UserResponse = z.object({
    user: User,
});

export type UserResponse = z.infer<typeof UserResponse>;

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
    lastConnected: z.string().datetime(),
    skuName: z.string(),
    model: z.string(),
    version: z.number(),
    connected: z.boolean(),
});

export const MattressInfo = z.object({
    firstUsedDate: z.string().datetime().nullable(),
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
    asOf: z.string().datetime(),
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
    lastLowWater: z.string().datetime(),
    lastPrime: z.string().datetime(),
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
    lastHeard: z.string().datetime(),
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

export const CurrentStateInstance = z.object({
    timestamp: z.string().datetime(),
});

export const CurrentState = z.object({
    type: z.string(),
    started: z.string().datetime(),
    instance: CurrentStateInstance,
});

export const SmartSettings = z.object({
    bedTimeLevel: z.number(),
    initialSleepLevel: z.number(),
    finalSleepLevel: z.number(),
});

export const TimeBasedSettings = z.object({
    level: z.number(),
    durationSeconds: z.number(),
});

export const ScheduleSettings = z.object({
    id: z.string(),
    enabled: z.boolean(),
    time: z.string(),
    days: z.array(z.enum(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"])),
    tags: z.array(z.string()),
    startSettings: z.object({}),
});

export const NextSchedule = z.object({
    nextTimestamp: z.string().datetime(),
    id: z.string(),
    enabled: z.boolean(),
    time: z.string(),
    days: z.array(z.enum(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"])),
    tags: z.array(z.string()),
    startSettings: z.object({}),
});

export const NextBedtimeDisplayWindow = z.object({
    displayWindowHours: z.number(),
    nextTimestampInWindow: z.boolean(),
});

export const Temperature = z.object({
    currentLevel: z.number(),
    currentDeviceLevel: z.number(),
    overrideLevels: z.object({}),
    currentState: CurrentState,
    scheduleType: z.enum(["timeBased", "smart"]),
    smart: SmartSettings,
    timeBased: TimeBasedSettings,
    currentSchedule: ScheduleSettings,
    nextSchedule: NextSchedule,
    nextBedtimeDisplayWindow: NextBedtimeDisplayWindow,
});

export const Bedtime = z.object({
    time: z.string(),
    dayOffset: z.enum(["Zero", "One", "MinusOne"]),
});

export const Routine = z.object({
    id: z.string().uuid(),
    alarms: z.array(z.unknown()),
    days: z.array(z.enum(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"])),
    enabled: z.boolean(),
    bedtime: Bedtime,
});

export const RoutineSettings = z.object({
    routines: z.array(Routine),
    oneOffAlarms: z.array(z.unknown()),
});

export const RoutineState = z.object({
    status: z.string(),
    upcomingRoutineId: z.string().uuid(),
});

export const RoutinesResponse = z.object({
    settings: RoutineSettings,
    state: RoutineState,
});
