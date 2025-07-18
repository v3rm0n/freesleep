import { render } from "hono/jsx/dom";
import { Graph, type Temperature, type Time } from "./graph.tsx";
import PaperProvider from "./paper.tsx";

const root = document.getElementById("root");

const initialState: [Time, Temperature][] = [
	["22:00", 18.5],
	["00:00", 16.2],
	["02:00", 15.0],
	["04:00", 14.8],
	["06:00", 16.5],
	["08:00", 19.0],
];

if (root) {
	render(
		<PaperProvider>
			<Graph data={initialState} />
		</PaperProvider>,
		root,
	);
}
