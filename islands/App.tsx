import { useEffect, useState } from "preact/hooks";
import { api } from "../components/client.ts";
import {
	DEFAULT_SCHEDULE,
	formatTime,
	Graph,
	NIGHT_CROSSOVER_HOUR,
	type Temperature,
	type Time,
} from "../components/Graph.tsx";
import { Login } from "../components/Login.tsx";
import PaperProvider from "../components/Paper.tsx";
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

type Schedule = [Time, Temperature][];
type Schedules = Record<Side, Schedule>;

const DEFAULT_SCHEDULES: Schedules = {
	left: DEFAULT_SCHEDULE,
	right: DEFAULT_SCHEDULE,
};

// Schedule points travel as ISO timestamps: "HH:MM" on today's date, or on
// tomorrow's for times before the night crossover, so a night sorts in order.
// The server only looks at the time of day (see server/schedule.ts).
const timeToISODateTime = (time: Time): string => {
	const [hours, minutes] = time.split(":").map(Number);
	const date = new Date();
	date.setHours(hours, minutes, 0, 0);
	if (hours < NIGHT_CROSSOVER_HOUR) {
		date.setDate(date.getDate() + 1);
	}
	return date.toISOString();
};

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

export default function App() {
	const [currentState, setCurrentState] = useState<
		CurrentState | null | undefined
	>(undefined);
	const [schedules, setSchedules] = useState<Schedules>(DEFAULT_SCHEDULES);
	const [currentSide, setCurrentSide] = useState<Side>("left");
	const [theme, toggleTheme] = useResolvedTheme();

	const checkAuthentication = async () => {
		try {
			const response = await api.getState();
			if (response.ok) {
				setCurrentState((await response.json()) as CurrentState);
			} else {
				setCurrentState(null);
			}
		} catch (error) {
			console.error("Authentication check failed:", error);
			setCurrentState(null);
		}
	};

	useEffect(() => {
		checkAuthentication();
	}, []);

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

	// Load the saved schedules once authenticated.
	useEffect(() => {
		if (currentState) {
			loadSchedules();
		}
	}, [currentState]);

	const handleLogout = async () => {
		try {
			const response = await api.logout();
			if (!response.ok) {
				console.error("Failed to logout");
			}
		} catch (error) {
			console.error("Error during logout:", error);
		} finally {
			setCurrentState(null);
			setSchedules(DEFAULT_SCHEDULES);
		}
	};

	const handleTemperatureChange = async (data: Schedule) => {
		// Controlled: adopt the new curve immediately, then persist it.
		setSchedules((previous) => ({ ...previous, [currentSide]: data }));
		try {
			const levels = data.map(([time, temperature]) => ({
				time: timeToISODateTime(time),
				level: temperatureToHeatingLevel(temperature),
			}));
			const response = await api.setExpectedState(currentSide, { levels });
			if (!response.ok) {
				console.error(`Failed to save the schedule (${response.status})`);
			}
		} catch (error) {
			console.error("Error saving the schedule:", error);
		}
	};

	// Show loading state while checking authentication
	if (currentState === undefined) {
		return (
			<div
				style={{
					display: "flex",
					justifyContent: "center",
					alignItems: "center",
					height: "100vh",
					fontSize: "18px",
				}}
			>
				Loading...
			</div>
		);
	}

	// Show login page if not authenticated
	if (!currentState) {
		return <Login onLoginSuccess={checkAuthentication} />;
	}

	const temperatureData = schedules[currentSide];
	const nowMarker = {
		time: formatTime(new Date()),
		temperature: heatingLevelToTemperature(
			currentState[currentSide].currentLevel.level,
		),
	};

	return (
		<PaperProvider>
			<div style={{ padding: "20px" }}>
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						marginBottom: "12px",
						gap: "10px",
						flexWrap: "wrap",
					}}
				>
					<div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
						<span style={{ fontSize: "16px", fontWeight: "500" }}>Side:</span>
						<div
							style={{
								display: "flex",
								backgroundColor: "var(--surface)",
								border: "1px solid var(--border)",
								borderRadius: "8px",
								padding: "2px",
							}}
						>
							{(["left", "right"] as const).map((side) => (
								<button
									key={side}
									type="button"
									onClick={() => setCurrentSide(side)}
									style={{
										padding: "8px 16px",
										backgroundColor:
											currentSide === side ? "var(--accent)" : "transparent",
										color:
											currentSide === side ? "var(--accent-fg)" : "var(--fg)",
										border: "none",
										borderRadius: "6px",
										cursor: "pointer",
										fontSize: "14px",
										fontWeight: "500",
										fontFamily: "SF Pro Display, sans-serif",
										transition: "all 0.2s ease",
										textTransform: "capitalize",
									}}
								>
									{side}
								</button>
							))}
						</div>
					</div>
					<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
						<button
							type="button"
							onClick={toggleTheme}
							aria-label="Toggle light or dark theme"
							title="Toggle light / dark"
							style={{
								width: "40px",
								height: "40px",
								backgroundColor: "var(--surface)",
								color: "var(--fg)",
								border: "1px solid var(--border)",
								borderRadius: "8px",
								cursor: "pointer",
								fontSize: "16px",
							}}
						>
							{theme === "dark" ? "☀️" : "🌙"}
						</button>
						<button
							type="button"
							onClick={handleLogout}
							style={{
								padding: "10px 20px",
								backgroundColor: "var(--danger)",
								color: "#fff",
								border: "none",
								borderRadius: "8px",
								cursor: "pointer",
								fontSize: "14px",
							}}
						>
							Logout
						</button>
					</div>
				</div>
				<p
					style={{
						margin: "0 0 8px",
						textAlign: "left",
						fontSize: "13px",
						color: "var(--muted)",
					}}
				>
					Drag a point to set its temperature · double-click to add or remove a
					point
				</p>
				<Graph
					data={temperatureData}
					onChange={handleTemperatureChange}
					now={nowMarker}
					theme={theme}
					key={`${currentSide}-${temperatureData.length}-graph`}
				/>
			</div>
		</PaperProvider>
	);
}
