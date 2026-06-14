import * as z from "zod/v4";
import { resolveAccessToken } from "./eightsleep_api/access_token.ts";
import * as http from "./eightsleep_api/http.ts";
import {
	HeatingLevel,
	type Side,
	UserId,
} from "./eightsleep_api/model/index.ts";
import { openKv } from "./kv.ts";
import type { SessionId } from "./session.ts";

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

export const CurrentState = z.strictObject({
	left: CurrentStateSide,
	right: CurrentStateSide,
});

export type CurrentState = z.infer<typeof CurrentState>;

export const ExpectedStateSide = z.object({
	levels: z.array(HeatingState),
});

export type ExpectedStateSide = z.infer<typeof ExpectedStateSide>;

export const ExpectedState = z.object({
	left: ExpectedStateSide,
	right: ExpectedStateSide,
});

export type ExpectedState = z.infer<typeof ExpectedState>;

export const getCurrentState = async (id: SessionId): Promise<CurrentState> => {
	const accessToken = await resolveAccessToken(id);
	const { id: deviceId } = await http.currentDevice(
		accessToken.userId,
		accessToken,
	);
	const device = await http.device(deviceId, accessToken);
	return {
		left: {
			userId: device.leftUserId,
			isHeating: device.leftNowHeating,
			currentLevel: {
				level: device.leftHeatingLevel,
				time: new Date().toISOString(),
			},
			targetLevel: {
				level: device.leftTargetHeatingLevel,
				time: new Date().toISOString(),
			},
		},
		right: {
			userId: device.rightUserId,
			isHeating: device.rightNowHeating,
			currentLevel: {
				level: device.rightHeatingLevel,
				time: new Date().toISOString(),
			},
			targetLevel: {
				level: device.rightTargetHeatingLevel,
				time: new Date().toISOString(),
			},
		},
	};
};

export const setCurrentHeatingLevel = async (
	id: SessionId,
	userId: UserId,
	level: HeatingLevel,
): Promise<void> => {
	const accessToken = await resolveAccessToken(id);
	await http.setTemperature(userId, level, accessToken);
};

export const getExpectedState = async (
	id: SessionId,
): Promise<ExpectedState | null> => {
	const db = await openKv();
	const { value } = await db.get(["expectedState", id]);
	if (!value) {
		return null;
	}
	return ExpectedState.parse(value);
};

export const setSideExpectedState = async (
	id: SessionId,
	side: Side,
	state: ExpectedStateSide,
) => {
	let expectedState = await getExpectedState(id);
	if (!expectedState) {
		expectedState = {
			left: state,
			right: state,
		};
	} else {
		expectedState[side] = state;
	}
	setExpectedState(id, expectedState);
};

export const setExpectedState = async (id: SessionId, state: ExpectedState) => {
	const db = await openKv();
	await db.set(["expectedState", id], state);
};

export const removeExpectedState = async (id: SessionId) => {
	const db = await openKv();
	await db.delete(["expectedState", id]);
};

export const copyExpectedState = async (oldId: SessionId, newId: SessionId) => {
	const db = await openKv();
	const { value: existingValue } = await db.get(["expectedState", oldId]);
	if (!existingValue) {
		return;
	}
	await db.set(["expectedState", newId], existingValue);
};
