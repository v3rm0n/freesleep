import { useEffect, useRef, useState } from "preact/hooks";
import { api } from "../components/client.ts";
import type { Schedule } from "../components/Graph.tsx";
import { Login, Unavailable } from "../components/Login.tsx";
import { formatTime, toISODateTime } from "../components/night.ts";
import { DEFAULT_SCHEDULE } from "../components/presets.ts";
import { LiveReading, SchedulePanel } from "../components/SchedulePanel.tsx";
import { Notice, ThemeToggle, TopBar } from "../components/Shell.tsx";
import { useResolvedTheme } from "../components/theme.ts";
import type { Side } from "../server/eightsleep_api/model/index.ts";
import type {
	CurrentState,
	ExpectedState,
	ExpectedStateSide,
} from "../server/state.ts";
import {
	heatingLevelToTemperature,
	temperatureToHeatingLevel,
} from "../server/temperature.ts";

type Schedules = Record<Side, Schedule>;

const DEFAULT_SCHEDULES: Schedules = {
	left: DEFAULT_SCHEDULE,
	right: DEFAULT_SCHEDULE,
};

type Session =
	| { status: "checking" }
	| { status: "signed-out" }
	| { status: "unavailable" }
	| { status: "ready"; current: CurrentState };

type SaveStatus = "idle" | "saving" | "saved" | "error";

// How often the pod's live reading is refreshed while the page is visible.
const REFRESH_INTERVAL_MS = 60_000;
// How long the "Saved" confirmation stays visible.
const SAVED_NOTICE_MS = 2_000;

// A side's saved points as graph data, or the default curve when the side has
// never been drawn.
const toSchedule = ({ levels }: ExpectedStateSide): Schedule => {
	if (levels.length === 0) {
		return DEFAULT_SCHEDULE;
	}
	return [...levels]
		.sort((a, b) => Date.parse(a.time) - Date.parse(b.time))
		.map(({ time, level }) => [
			formatTime(new Date(time)),
			heatingLevelToTemperature(level),
		]);
};

interface SaveIndicatorProps {
	status: SaveStatus;
	onRetry: () => void;
}

const SaveIndicator = ({ status, onRetry }: SaveIndicatorProps) => {
	if (status === "idle") {
		return null;
	}
	if (status === "error") {
		return (
			<span class="save-status save-status--error" role="alert">
				Couldn't save
				<button type="button" class="link-button" onClick={onRetry}>
					Retry
				</button>
			</span>
		);
	}
	return (
		<span class="save-status" role="status">
			{status === "saving" ? "Saving…" : "Saved"}
		</span>
	);
};

export default function App() {
	const [session, setSession] = useState<Session>({ status: "checking" });
	const [schedules, setSchedules] = useState<Schedules>(DEFAULT_SCHEDULES);
	const [currentSide, setCurrentSide] = useState<Side>("left");
	const [theme, toggleTheme] = useResolvedTheme();
	const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
	// The last change that failed to save, so it can be retried.
	const failedSaveRef = useRef<{ side: Side; data: Schedule } | null>(null);
	// Only the most recent save reports its outcome.
	const saveSequenceRef = useRef(0);

	// Reads the pod's current state. On the first call this decides between the
	// app and the login screen; later calls only refresh the live reading.
	const refreshCurrentState = async () => {
		try {
			const response = await api.getState();
			if (response.ok) {
				const current = (await response.json()) as CurrentState;
				setSession({ status: "ready", current });
			} else if (response.status === 401) {
				setSession({ status: "signed-out" });
			} else {
				console.error(`Could not read the pod's state (${response.status})`);
				setSession((previous) =>
					previous.status === "ready" ? previous : { status: "unavailable" },
				);
			}
		} catch (error) {
			console.error("Could not read the pod's state:", error);
			setSession((previous) =>
				previous.status === "ready" ? previous : { status: "unavailable" },
			);
		}
	};

	useEffect(() => {
		refreshCurrentState();
	}, []);

	const isReady = session.status === "ready";

	// Keep the live reading fresh while the page is visible.
	useEffect(() => {
		if (!isReady) return;
		const refreshIfVisible = () => {
			if (document.visibilityState === "visible") {
				refreshCurrentState();
			}
		};
		const interval = setInterval(refreshIfVisible, REFRESH_INTERVAL_MS);
		document.addEventListener("visibilitychange", refreshIfVisible);
		return () => {
			clearInterval(interval);
			document.removeEventListener("visibilitychange", refreshIfVisible);
		};
	}, [isReady]);

	const loadSchedules = async () => {
		try {
			const response = await api.getExpectedState();
			if (!response.ok) {
				throw new Error(`Unexpected status ${response.status}`);
			}
			const result = (await response.json()) as ExpectedState | null;
			setSchedules(
				result
					? { left: toSchedule(result.left), right: toSchedule(result.right) }
					: DEFAULT_SCHEDULES,
			);
		} catch (error) {
			console.error("Error loading the schedule:", error);
			setSchedules(DEFAULT_SCHEDULES);
		}
	};

	// Load the saved schedules once signed in.
	useEffect(() => {
		if (isReady) {
			loadSchedules();
		}
	}, [isReady]);

	// Let the "Saved" confirmation fade out on its own.
	useEffect(() => {
		if (saveStatus !== "saved") return;
		const timeout = setTimeout(() => setSaveStatus("idle"), SAVED_NOTICE_MS);
		return () => clearTimeout(timeout);
	}, [saveStatus]);

	const handleSignOut = async () => {
		try {
			const response = await api.logout();
			if (!response.ok) {
				console.error(`Failed to sign out (${response.status})`);
			}
		} catch (error) {
			console.error("Error during sign out:", error);
		} finally {
			setSession({ status: "signed-out" });
			setSchedules(DEFAULT_SCHEDULES);
			setSaveStatus("idle");
		}
	};

	const saveSchedule = async (side: Side, data: Schedule) => {
		const sequence = ++saveSequenceRef.current;
		setSaveStatus("saving");
		try {
			// Points travel as ISO timestamps anchored to tonight, in night order
			// (see components/night.ts); the server only looks at the time of day.
			const levels = data.map(([time, temperature]) => ({
				time: toISODateTime(time, data[0][0]),
				level: temperatureToHeatingLevel(temperature),
			}));
			const response = await api.setExpectedState(side, { levels });
			if (!response.ok) {
				throw new Error(`Unexpected status ${response.status}`);
			}
			if (sequence === saveSequenceRef.current) {
				failedSaveRef.current = null;
				setSaveStatus("saved");
			}
		} catch (error) {
			console.error("Error saving the schedule:", error);
			if (sequence === saveSequenceRef.current) {
				failedSaveRef.current = { side, data };
				setSaveStatus("error");
			}
		}
	};

	const handleTemperatureChange = (data: Schedule) => {
		// Controlled: adopt the new curve immediately, then persist it.
		setSchedules((previous) => ({ ...previous, [currentSide]: data }));
		saveSchedule(currentSide, data);
	};

	const retrySave = () => {
		const failed = failedSaveRef.current;
		if (failed) {
			saveSchedule(failed.side, failed.data);
		}
	};

	if (session.status === "checking") {
		return (
			<div class="app">
				<TopBar />
				<Notice busy>
					<p>Checking your session…</p>
				</Notice>
			</div>
		);
	}

	if (session.status === "signed-out") {
		return (
			<Login
				theme={theme}
				onToggleTheme={toggleTheme}
				onLoginSuccess={refreshCurrentState}
			/>
		);
	}

	if (session.status === "unavailable") {
		return (
			<Unavailable
				theme={theme}
				onToggleTheme={toggleTheme}
				onRetry={refreshCurrentState}
			/>
		);
	}

	const sideState = session.current[currentSide];
	const nowMarker = {
		time: formatTime(new Date()),
		temperature: heatingLevelToTemperature(sideState.currentLevel.level),
	};

	return (
		<div class="app">
			<TopBar>
				<ThemeToggle theme={theme} onToggle={toggleTheme} />
				<button type="button" class="button" onClick={handleSignOut}>
					Sign out
				</button>
			</TopBar>
			<main class="main">
				<SchedulePanel
					side={currentSide}
					onSideChange={setCurrentSide}
					data={schedules[currentSide]}
					onChange={handleTemperatureChange}
					now={nowMarker}
					theme={theme}
					status={
						<>
							<LiveReading
								active={sideState.isHeating}
								current={nowMarker.temperature}
								target={heatingLevelToTemperature(sideState.targetLevel.level)}
							/>
							<SaveIndicator status={saveStatus} onRetry={retrySave} />
						</>
					}
				/>
			</main>
		</div>
	);
}
