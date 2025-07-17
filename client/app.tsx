import { hc } from "hono/client";
import { render, useState } from "hono/jsx/dom";
import type { AppType } from "../server/api.ts";
import { Graph, type Temperature, type Time } from "./graph.tsx";
import PaperProvider from "./paper.tsx";

const _client = hc<AppType>("/");

function App() {
	const [temperatureData, _setTemperatureData] = useState<
		[Time, Temperature][]
	>([
		["22:00", 18.5],
		["00:00", 16.2],
		["02:00", 15.0],
		["04:00", 14.8],
		["06:00", 16.5],
		["08:00", 19.0],
	]);

	const handleTemperatureChange = (time: string, temperature: number) => {
		console.log(`Temperature at ${time} changed to ${temperature}°C`);
	};

	return (
		<PaperProvider>
			<Graph data={temperatureData} onChange={handleTemperatureChange} />
		</PaperProvider>
	);
}

const root = document.getElementById("root");

if (root) {
	render(<App />, root);
}
