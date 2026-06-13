import { Graph, type Temperature, type Time } from "../components/Graph.tsx";
import PaperProvider from "../components/Paper.tsx";

const initialState: [Time, Temperature][] = [
	["22:00", 18.5],
	["00:00", 16.2],
	["02:00", 15.0],
	["04:00", 14.8],
	["06:00", 16.5],
	["08:00", 19.0],
];

export default function Demo() {
	return (
		<PaperProvider>
			<Graph data={initialState} />
		</PaperProvider>
	);
}
