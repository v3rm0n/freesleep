import { useCallback, useEffect, useState } from "preact/hooks";
import { api } from "../components/client.ts";
import { Graph, type Temperature, type Time } from "../components/Graph.tsx";
import { Login } from "../components/Login.tsx";
import PaperProvider from "../components/Paper.tsx";
import {
	heatingLevelToTemperatureMap,
	maximumTemperature,
	minimumTemperature,
} from "../server/constants.ts";
import type { Side } from "../server/eightsleep_api/model/index.ts";
import type { CurrentState, ExpectedState } from "../server/state.ts";

export default function App() {
	const initialState: [Time, Temperature][] = [
		["22:00", 18.5],
		["00:00", 16.2],
		["02:00", 15.0],
		["04:00", 14.8],
		["06:00", 16.5],
		["08:00", 19.0],
	];

	const [currentState, setCurrentState] = useState<
		CurrentState | null | undefined
	>(undefined);
	const [expectedState, setExpectedState] = useState<ExpectedState | null>(
		null,
	);
	const [currentSide, setCurrentSide] = useState<Side>("left");
	const [temperatureData, setTemperatureData] =
		useState<[Time, Temperature][]>(initialState);
	const [theme, setTheme] = useState<"dark" | "light">("dark");

	// Adopt the theme the no-flash script in _app.tsx already resolved.
	useEffect(() => {
		const resolved =
			(document.documentElement.dataset.theme as "dark" | "light") ?? "dark";
		setTheme(resolved);
	}, []);

	const toggleTheme = () => {
		setTheme((prev) => {
			const next = prev === "dark" ? "light" : "dark";
			document.documentElement.dataset.theme = next;
			try {
				localStorage.setItem("freesleep-theme", next);
			} catch {
				// ignore storage being unavailable
			}
			return next;
		});
	};

	const checkAuthentication = async () => {
		try {
			const response = await api.getState();
			if (response.ok) {
				const result = (await response.json()) as CurrentState;
				console.log(result);
				setCurrentState(result);
			} else {
				setCurrentState(null);
			}
		} catch (error) {
			console.log("Authentication check failed:", error);
			setCurrentState(null);
		}
	};

	useEffect(() => {
		checkAuthentication();
	}, []);

	const handleLoginSuccess = () => {
		checkAuthentication();
	};

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
			setTemperatureData(initialState);
			setExpectedState(null);
		}
	};

	const handleSideChange = (side: Side) => {
		setCurrentSide(side);
	};

	// Helper function to convert heating level (-100 to 100) to temperature (13°C to 44°C)
	const heatingLevelToTemperature = (level: number): number => {
		// Use the exact mapping table
		const levelStr = level.toString();
		if (levelStr in heatingLevelToTemperatureMap) {
			return heatingLevelToTemperatureMap[
				levelStr as keyof typeof heatingLevelToTemperatureMap
			];
		}

		// For levels not in the table, find the closest mapping points and interpolate
		const levels = Object.keys(heatingLevelToTemperatureMap)
			.map(Number)
			.sort((a, b) => a - b);

		// Find the two closest levels
		let lowerLevel = levels[0];
		let upperLevel = levels[levels.length - 1];

		for (let i = 0; i < levels.length - 1; i++) {
			if (levels[i] <= level && levels[i + 1] >= level) {
				lowerLevel = levels[i];
				upperLevel = levels[i + 1];
				break;
			}
		}

		// Interpolate between the two closest points
		const lowerTemp =
			heatingLevelToTemperatureMap[
				lowerLevel.toString() as keyof typeof heatingLevelToTemperatureMap
			];
		const upperTemp =
			heatingLevelToTemperatureMap[
				upperLevel.toString() as keyof typeof heatingLevelToTemperatureMap
			];

		if (lowerLevel === upperLevel) {
			return lowerTemp;
		}

		const ratio = (level - lowerLevel) / (upperLevel - lowerLevel);
		return lowerTemp + ratio * (upperTemp - lowerTemp);
	};

	// Helper function to convert temperature (13°C to 44°C) to heating level (-100 to 100)
	const temperatureToHeatingLevel = (temp: number): number => {
		// Clamp temperature to valid range first
		const clampedTemp = Math.max(
			minimumTemperature,
			Math.min(maximumTemperature, temp),
		);

		// Find exact match in the mapping table
		for (const [levelStr, mappedTemp] of Object.entries(
			heatingLevelToTemperatureMap,
		)) {
			if (mappedTemp === clampedTemp) {
				return Number(levelStr);
			}
		}

		// No exact match, find the closest temperature points and interpolate
		const entries = Object.entries(heatingLevelToTemperatureMap)
			.map(([level, temperature]) => ({ level: Number(level), temperature }))
			.sort((a, b) => a.temperature - b.temperature);

		// Find the two closest temperature points
		let lowerEntry = entries[0];
		let upperEntry = entries[entries.length - 1];

		for (let i = 0; i < entries.length - 1; i++) {
			if (
				entries[i].temperature <= clampedTemp &&
				entries[i + 1].temperature >= clampedTemp
			) {
				lowerEntry = entries[i];
				upperEntry = entries[i + 1];
				break;
			}
		}

		// Interpolate between the two closest points
		if (lowerEntry.temperature === upperEntry.temperature) {
			return lowerEntry.level;
		}

		const ratio =
			(clampedTemp - lowerEntry.temperature) /
			(upperEntry.temperature - lowerEntry.temperature);
		const interpolatedLevel =
			lowerEntry.level + ratio * (upperEntry.level - lowerEntry.level);

		return Math.round(interpolatedLevel);
	};

	// Helper function to convert time string to ISO datetime, handling midnight crossover
	const timeToISODateTime = (timeStr: string, baseDate?: Date): string => {
		const base = baseDate || new Date();
		const [hours, minutes] = timeStr.split(":").map(Number);
		const date = new Date(base);
		date.setHours(hours, minutes, 0, 0);

		// If the time is before 12:00 PM, assume it's the next day (for sleep schedules)
		if (hours < 12) {
			date.setDate(date.getDate() + 1);
		}

		return date.toISOString();
	};

	// Helper function to convert ISO datetime to time string
	const isoDateTimeToTime = (isoString: string): string => {
		const date = new Date(isoString);
		return `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
	};

	// Helper function to convert API data to graph format while preserving time order
	const convertApiToGraphData = (
		apiData: { levels: Array<{ time: Time; level: number }> } | null,
	) => {
		if (!apiData || !apiData.levels || apiData.levels.length === 0) {
			return [];
		}

		// Sort by time to ensure proper order
		const sortedLevels = [...apiData.levels].sort((a, b) => {
			return new Date(a.time).getTime() - new Date(b.time).getTime();
		});

		return sortedLevels.map((level) => [
			isoDateTimeToTime(level.time),
			heatingLevelToTemperature(level.level),
		]);
	};

	const loadExpectedState = async () => {
		try {
			const response = await api.getExpectedState();
			if (response.ok) {
				const result = (await response.json()) as ExpectedState | null;
				if (!result) {
					setTemperatureData(initialState);
					return;
				} else {
					setExpectedState(result);
				}
			} else {
				console.error("Failed to fetch expected state");
				// Use default data on error
				setTemperatureData(initialState);
			}
		} catch (error) {
			console.error("Error loading expected state:", error);
			// Use default data on error
			setTemperatureData(initialState);
		}
	};

	useEffect(() => {
		if (expectedState) {
			const levels = expectedState[currentSide].levels;
			if (levels && levels.length > 0) {
				// Convert API data to graph format with proper ordering
				const graphData = convertApiToGraphData(expectedState[currentSide]);
				setTemperatureData(graphData as [Time, Temperature][]);
			}
		}
	}, [expectedState, currentSide]);

	// Load expected state when authenticated or side changes
	useEffect(() => {
		if (currentState) {
			loadExpectedState();
		}
	}, [currentState]);

	const handleTemperatureChange = useCallback(
		async (data: [Time, Temperature][]) => {
			// Controlled: adopt the new curve immediately, then persist it.
			setTemperatureData(data);
			try {
				const levels = data.map(([t, temp]) => {
					return {
						time: timeToISODateTime(t),
						level: temperatureToHeatingLevel(temp),
					};
				});

				// Submit to API
				const response = await api.setExpectedState(currentSide, { levels });

				if (!response.ok) {
					console.error("Failed to update expected state");
				}
			} catch (error) {
				console.error("Error updating expected state:", error);
			}
		},
		[currentSide],
	);

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
		return <Login onLoginSuccess={handleLoginSuccess} />;
	}

	const nowDate = new Date();
	const nowMarker = {
		time: `${nowDate.getHours().toString().padStart(2, "0")}:${nowDate
			.getMinutes()
			.toString()
			.padStart(2, "0")}`,
		temperature:
			Math.round(
				heatingLevelToTemperature(
					currentState[currentSide].currentLevel.level,
				) * 10,
			) / 10,
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
									onClick={() => handleSideChange(side)}
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
