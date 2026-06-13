import { useEffect, useState } from "preact/hooks";
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
	const [data, setData] = useState<[Time, Temperature][]>(initialState);
	const [theme, setTheme] = useState<"dark" | "light">("dark");

	// Match whatever theme the no-flash script in _app.tsx resolved.
	useEffect(() => {
		setTheme(
			(document.documentElement.dataset.theme as "dark" | "light") ?? "dark",
		);
	}, []);

	return (
		<PaperProvider>
			<Graph
				data={data}
				onChange={setData}
				now={{ time: "02:40", temperature: 15.4 }}
				theme={theme}
				key={`demo-${data.length}`}
			/>
		</PaperProvider>
	);
}
