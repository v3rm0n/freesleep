import { useState } from "preact/hooks";
import {
	DEFAULT_SCHEDULE,
	Graph,
	type Temperature,
	type Time,
} from "../components/Graph.tsx";
import PaperProvider from "../components/Paper.tsx";
import { useResolvedTheme } from "../components/theme.ts";

export default function Demo() {
	const [data, setData] = useState<[Time, Temperature][]>(DEFAULT_SCHEDULE);
	const [theme] = useResolvedTheme();

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
