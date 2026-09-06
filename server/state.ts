import * as z from "zod/v4";
import * as http from "./eightsleep_api/http.ts";
import {
	type AccessToken,
	HeatingLevel,
	type Side,
	UserId,
} from "./eightsleep_api/model/index.ts";
import { openKv } from "./kv.ts";
import type { SessionId } from "./session.ts";

// The graph allows 12 points per side; this only guards the 64 KiB KV value
// limit against oversized API requests.
export const MAX_SCHEDULE_POINTS = 100;

const HeatingState = z.object({
	level: HeatingLevel,
	time: z.iso.datetime(),
});

export type HeatingState = z.infer<typeof HeatingState>;

const CurrentStateSide = z.object({
	userId: UserId,
	isHeating: z.boolean(),
	currentLevel: HeatingState,
	targetLevel: HeatingState,
});

export type CurrentStateSide = z.infer<typeof CurrentStateSide>;

export const CurrentState = z.strictObject({
	left: CurrentStateSide,
	right: CurrentStateSide,
});

export type CurrentState = z.infer<typeof CurrentState>;

export const ExpectedStateSide = z.object({
	levels: z.array(HeatingState).max(MAX_SCHEDULE_POINTS),
});

export type ExpectedStateSide = z.infer<typeof ExpectedStateSide>;

export const ExpectedState = z.object({
	left: ExpectedStateSide,
	right: ExpectedStateSide,
});

export type ExpectedState = z.infer<typeof ExpectedState>;

export const expectedStateKey = (id: SessionId): Deno.KvKey => [
	"expectedState",
	id,
];

export const getCurrentState = async (
	accessToken: AccessToken,
): Promise<CurrentState> => {
	const { id: deviceId } = await http.currentDevice(
		accessToken.userId,
		accessToken,
	);
	const device = await http.device(deviceId, accessToken);
	const time = new Date().toISOString();
	return {
		left: {
			userId: device.leftUserId,
			isHeating: device.leftNowHeating,
			currentLevel: { level: device.leftHeatingLevel, time },
			targetLevel: { level: device.leftTargetHeatingLevel, time },
		},
		right: {
			userId: device.rightUserId,
			isHeating: device.rightNowHeating,
			currentLevel: { level: device.rightHeatingLevel, time },
			targetLevel: { level: device.rightTargetHeatingLevel, time },
		},
	};
};

export const setCurrentHeatingLevel = (
	accessToken: AccessToken,
	userId: UserId,
	level: HeatingLevel,
): Promise<void> => http.setTemperature(userId, level, accessToken);

export const getExpectedState = async (
	id: SessionId,
): Promise<ExpectedState | null> => {
	const db = await openKv();
	const { value } = await db.get(expectedStateKey(id));
	return value === null ? null : ExpectedState.parse(value);
};

const EMPTY_SIDE: ExpectedStateSide = { levels: [] };

// Retries for optimistic KV transactions that lose against a concurrent write.
const MAX_ATTEMPTS = 5;

/**
 * Replaces one side's schedule and leaves the other side untouched (a side
 * that was never drawn stays empty).
 */
export const setSideExpectedState = async (
	id: SessionId,
	side: Side,
	state: ExpectedStateSide,
): Promise<void> => {
	const db = await openKv();
	for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
		const entry = await db.get(expectedStateKey(id));
		const current =
			entry.value === null
				? { left: EMPTY_SIDE, right: EMPTY_SIDE }
				: ExpectedState.parse(entry.value);
		const result = await db
			.atomic()
			.check(entry)
			.set(expectedStateKey(id), { ...current, [side]: state })
			.commit();
		if (result.ok) {
			return;
		}
	}
	throw new Error(
		`Could not save the schedule for ${id}: too many concurrent updates`,
	);
};
