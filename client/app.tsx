import { hc } from "hono/client";
import { render, useEffect, useState } from "hono/jsx/dom";
import type { AppType } from "../server/api.ts";
import {
	heatingLevelToTemperatureMap,
	maximumTemperature,
	minimumTemperature,
} from "../server/constants.ts";
import { Graph, type Temperature, type Time } from "./graph.tsx";
import { Login } from "./login.tsx";
import PaperProvider from "./paper.tsx";

const client = hc<AppType>("/");

function App() {
	const initialState: [Time, Temperature][] = [
		["22:00", 18.5],
		["00:00", 16.2],
		["02:00", 15.0],
		["04:00", 14.8],
		["06:00", 16.5],
		["08:00", 19.0],
	];

	const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
	const [temperatureData, setTemperatureData] =
		useState<[Time, Temperature][]>(initialState);

	const checkAuthentication = async () => {
		try {
			const response = await client.auth.check.$get();
			if (response.ok) {
				const result = await response.json();
				setIsAuthenticated(result.authenticated);
			} else {
				setIsAuthenticated(false);
			}
		} catch (error) {
			console.log("Authentication check failed:", error);
			setIsAuthenticated(false);
		}
	};

	useEffect(() => {
		checkAuthentication();
	}, []);

	const handleLoginSuccess = () => {
		setIsAuthenticated(true);
	};

	const handleLogout = async () => {
		try {
			const response = await client.logout.$post();
			if (response.ok) {
				setIsAuthenticated(false);
				setTemperatureData(initialState);
			} else {
				console.error("Failed to logout");
			}
		} catch (error) {
			console.error("Error during logout:", error);
		}
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
			const response = await client.state.expected.$get();
			if (response.ok) {
				const result = await response.json();
				if (result?.levels && result.levels.length > 0) {
					// Convert API data to graph format with proper ordering
					const graphData = convertApiToGraphData(result);
					setTemperatureData(graphData as [Time, Temperature][]);
				} else {
					// Use default data if no expected state is set
					setTemperatureData(initialState);
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

	// Load expected state when authenticated
	useEffect(() => {
		if (isAuthenticated) {
			loadExpectedState();
		}
	}, [isAuthenticated]);

	const handleTemperatureChange = async (data: [Time, Temperature][]) => {
		try {
			const levels = data.map(([t, temp]) => {
				return {
					time: timeToISODateTime(t),
					level: temperatureToHeatingLevel(temp),
				};
			});

			// Submit to API
			const response = await client.state.expected.$post({
				json: { levels },
			});

			if (!response.ok) {
				console.error("Failed to update expected state");
			}
		} catch (error) {
			console.error("Error updating expected state:", error);
		}
	};

	// Show loading state while checking authentication
	if (isAuthenticated === null) {
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
	if (!isAuthenticated) {
		return <Login onLoginSuccess={handleLoginSuccess} />;
	}

	return (
		<PaperProvider>
			<div style={{ padding: "20px" }}>
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						marginBottom: "20px",
					}}
				>
					<button
						type="button"
						onClick={handleLogout}
						style={{
							padding: "10px 20px",
							backgroundColor: "#dc3545",
							color: "white",
							border: "none",
							borderRadius: "5px",
							cursor: "pointer",
							fontSize: "14px",
						}}
					>
						Logout
					</button>
				</div>
				<Graph data={temperatureData} onChange={handleTemperatureChange} />
			</div>
		</PaperProvider>
	);
}

const root = document.getElementById("root");

if (root) {
	render(<App />, root);
}
