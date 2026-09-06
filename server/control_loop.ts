import { allCredentials } from "./credentials.ts";
import { resolveAccessToken } from "./eightsleep_api/access_token.ts";
import { type AccessToken, Side } from "./eightsleep_api/model/index.ts";
import { activeHeatingState } from "./schedule.ts";
import { SessionId } from "./session.ts";
import {
	type CurrentStateSide,
	getCurrentState,
	getExpectedState,
	type HeatingState,
	setCurrentHeatingLevel,
} from "./state.ts";

/**
 * Brings every logged-in user's pod in line with their schedule. Runs once a
 * minute from `Deno.cron`. Each session is reconciled on its own so one user's
 * expired credentials or API error cannot stall the others.
 */
export const controlLoop = async () => {
	console.log("Starting control loop");
	const now = new Date();
	let sessions = 0;
	try {
		for await (const { key } of await allCredentials()) {
			const sessionId = SessionId.safeParse(key[1]);
			if (!sessionId.success) {
				console.warn(
					`Skipping credentials with an invalid key: ${String(key)}`,
				);
				continue;
			}
			sessions++;
			try {
				await reconcileSession(sessionId.data, now);
			} catch (error) {
				console.error(`Failed to reconcile session ${sessionId.data}:`, error);
			}
		}
	} catch (error) {
		console.error("Failed to list sessions:", error);
	}
	console.log(`Control loop finished (${sessions} sessions)`);
};

const reconcileSession = async (sessionId: SessionId, now: Date) => {
	// Check the schedule before talking to Eight Sleep: most of the day there is
	// nothing to do, and the API calls are the expensive part.
	const expectedState = await getExpectedState(sessionId);
	if (!expectedState) {
		console.log(`No schedule set for ${sessionId}`);
		return;
	}
	const expected = {
		left: activeHeatingState(expectedState.left.levels, now),
		right: activeHeatingState(expectedState.right.levels, now),
	};
	if (!expected.left && !expected.right) {
		console.log(`Schedule not active right now for ${sessionId}`);
		return;
	}
	const accessToken = await resolveAccessToken(sessionId);
	const currentState = await getCurrentState(accessToken);
	for (const side of Side.options) {
		await reconcileSide(accessToken, side, currentState[side], expected[side]);
	}
};

const reconcileSide = async (
	accessToken: AccessToken,
	side: Side,
	current: CurrentStateSide,
	expected: HeatingState | null,
) => {
	const label = `${side} side (${current.userId})`;
	if (!expected) {
		console.log(`Schedule not active for ${label}`);
		return;
	}
	const target = current.targetLevel.level;
	if (target === expected.level) {
		console.log(`Already at level ${target} for ${label}`);
		return;
	}
	// The API reports a pod that is switched off as target level 0 (see
	// fixtures/device.json); leave it alone rather than switching it on. Level 0
	// is also how 27 °C is encoded, so a pod parked at 27 °C is not moved either.
	if (target === 0) {
		console.log(`Heating is off for ${label}`);
		return;
	}
	console.log(`Setting ${label} from level ${target} to ${expected.level}`);
	await setCurrentHeatingLevel(accessToken, current.userId, expected.level);
};
