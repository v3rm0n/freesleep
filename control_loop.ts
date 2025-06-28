import * as z from "zod/v4";
import { HeatingLevel } from "./api/model/index.ts";
import { getTemperature } from "./api/api.ts";

const HeatingState = z.object({
	level: HeatingLevel,
	time: z.iso.time(),
});

const ExpectedState = z
	.object({
		levels: z.array(HeatingState),
	})
	.nullable();

const getCurrentState = async () => {
	const temperature = await getTemperature();
	return {
		level: temperature.currentLevel,
		time: new Date().toISOString(),
	};
};

const getExpectedState = async () => {
	const db = await Deno.openKv();
	const { value } = await db.get(["expectedState"]);
	const expectedState = ExpectedState.parse(value);
	if (!expectedState) return null;
	return expectedState.levels.findLast(
		(level) => level.time <= new Date().toISOString(),
	);
};

const isInitialized = async () => {
	const db = await Deno.openKv();
	const { value } = await db.get(["user"]);
	return value !== null;
};

export const controlLoop = async () => {
	try {
		console.log("Starting control loop");
		if (!isInitialized()) {
			console.log("User not initialized");
			return;
		}
		const currentState = await getCurrentState();
		console.log("Current state:", currentState);
		const expectedState = await getExpectedState();
		console.log("Expected state:", expectedState);
		if (currentState !== expectedState) {
			console.log("State mismatch");
		}
	} catch (error) {
		console.error("Error in control loop:", error);
	}
};
