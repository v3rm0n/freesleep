import { allCredentials } from "./credentials.ts";
import { SessionId } from "./session.ts";
import {
	getCurrentHeatingState,
	getExpectedHeatingState,
	type HeatingState,
	setCurrentHeatingState,
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
				await getCurrentHeatingState(parsedId),
				await getExpectedHeatingState(parsedId),
			);
		}
		console.log("Control loop finished");
	} catch (error) {
		console.error("Error in control loop:", error);
	}
};

const reconcileState = async (
	sessionId: string,
	currentState: HeatingState,
	expectedState: HeatingState | null,
) => {
	console.log(`Reconciling state for ${sessionId}`);
	if (!expectedState) {
		console.log(`No expectations set for ${sessionId}`);
		return;
	}
	if (currentState.level === expectedState.level) {
		console.log(`States are equal for ${sessionId}`);
		return;
	}
	if (currentState.level === 0) {
		console.log(`Heating is off for ${sessionId}`);
		return;
	}
	console.log(`States differ, need to reconcile`);
	await setCurrentHeatingState(sessionId, expectedState.level);
};
