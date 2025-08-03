import { allCredentials } from "./credentials.ts";
import { Side, type UserId } from "./eightsleep_api/model/index.ts";
import { SessionId } from "./session.ts";
import {
	type CurrentState,
	type ExpectedState,
	getCurrentState,
	getExpectedState,
	type HeatingState,
	setCurrentHeatingLevel,
} from "./state.ts";

export const controlLoop = async () => {
	try {
		console.log("Starting control loop");
		const credentials = await allCredentials();
		for await (const credential of credentials) {
			const {
				key: [_, sessionId],
			} = credential;
			const parsedId = SessionId.parse(sessionId);
			await reconcileState(
				parsedId,
				await getCurrentState(parsedId),
				await getExpectedState(parsedId),
			);
		}
		console.log("Control loop finished");
	} catch (error) {
		console.error("Error in control loop:", error);
	}
};

const getExpectedHeatingLevel = (
	side: Side,
	expectedState: ExpectedState | null,
): HeatingState | null => {
	if (!expectedState) return null;
	return (
		expectedState[side].levels.findLast(
			(level) => level.time <= new Date().toISOString(),
		) || null
	);
};

const reconcileState = async (
	sessionId: string,
	currentState: CurrentState,
	expectedState: ExpectedState | null,
) => {
	console.log(`Reconciling state for ${sessionId}`);
	for (const i in currentState) {
		const side = Side.parse(i);
		await reconcile(
			sessionId,
			currentState[side].userId,
			currentState[side].targetLevel,
			getExpectedHeatingLevel(side, expectedState),
		);
	}
};

const reconcile = async (
	sessionId: SessionId,
	userId: UserId,
	currentTargetState: HeatingState,
	expectedState: HeatingState | null,
) => {
	if (!expectedState) {
		console.log(`Expectation not set for ${userId} (${sessionId})`);
		return;
	}
	if (currentTargetState.level === expectedState.level) {
		console.log(`States are equal for ${userId} (${sessionId})`);
		return;
	}
	if (currentTargetState.level === 0) {
		console.log(`Heating is off for ${userId} (${sessionId})`);
		return;
	}
	console.log(`States differ, need to reconcile`);
	await setCurrentHeatingLevel(sessionId, userId, expectedState.level);
};
