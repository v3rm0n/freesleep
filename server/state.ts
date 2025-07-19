import * as z from "zod/v4";
import { resolveAccessToken } from "./eightsleep_api/access_token.ts";
import * as http from "./eightsleep_api/http.ts";
import { HeatingLevel } from "./eightsleep_api/model/index.ts";
import type { SessionId } from "./session.ts";

const HeatingState = z.object({
	level: HeatingLevel,
	time: z.iso.datetime(),
});

export type HeatingState = z.infer<typeof HeatingState>;

export const ExpectedState = z
	.object({
		levels: z.array(HeatingState),
	})
	.nullable();

export type ExpectedState = z.infer<typeof ExpectedState>;

export const getCurrentHeatingState = async (
	id: SessionId,
): Promise<HeatingState> => {
	const accessToken = await resolveAccessToken(id);
	const temperature = await http.getTemperature(
		accessToken.userId,
		accessToken,
	);
	return HeatingState.parse({
		level: temperature.currentLevel,
		time: new Date().toISOString(),
	});
};

export const setCurrentHeatingState = async (
	id: SessionId,
	level: HeatingLevel,
): Promise<void> => {
	const accessToken = await resolveAccessToken(id);
	await http.setTemperature(level, accessToken);
};

export const getExpectedHeatingState = async (
	id: SessionId,
): Promise<HeatingState | null> => {
	const db = await Deno.openKv();
	const { value } = await db.get(["expectedState", id]);
	const expectedState = ExpectedState.parse(value);
	if (!expectedState) return null;
	return (
		expectedState.levels.findLast(
			(level) => level.time <= new Date().toISOString(),
		) || null
	);
};

export const getExpectedState = async (
	id: SessionId,
): Promise<ExpectedState> => {
	const db = await Deno.openKv();
	const { value } = await db.get(["expectedState", id]);
	return ExpectedState.parse(value);
};

export const setExpectedState = async (id: SessionId, state: ExpectedState) => {
	const db = await Deno.openKv();
	await db.set(["expectedState", id], state);
};

export const removeExpectedState = async (id: SessionId) => {
	const db = await Deno.openKv();
	await db.delete(["expectedState", id]);
};

export const copyExpectedState = async (oldId: SessionId, newId: SessionId) => {
	const db = await Deno.openKv();
	const { value: existingValue } = await db.get(["expectedState", oldId]);
	if (!existingValue) {
		return;
	}
	await db.set(["expectedState", newId], existingValue);
};
