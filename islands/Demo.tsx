import { useState } from "preact/hooks";
import type { Schedule } from "../components/Graph.tsx";
import { DEFAULT_SCHEDULE } from "../components/presets.ts";
import { LiveReading, SchedulePanel } from "../components/SchedulePanel.tsx";
import { ThemeToggle, TopBar } from "../components/Shell.tsx";
import { useResolvedTheme } from "../components/theme.ts";
import type { Side } from "../server/eightsleep_api/model/index.ts";

// A second curve so switching sides visibly does something.
const RIGHT_SCHEDULE: Schedule = [
	["22:30", 20.0],
	["00:30", 17.5],
	["03:00", 16.0],
	["06:30", 18.0],
	["08:00", 21.0],
];

const DEMO_NOW = { time: "02:40", temperature: 15.4 };

/** The full UI with in-memory state, so the graph can be tried without signing in. */
export default function Demo() {
	const [schedules, setSchedules] = useState<Record<Side, Schedule>>({
		left: DEFAULT_SCHEDULE,
		right: RIGHT_SCHEDULE,
	});
	const [side, setSide] = useState<Side>("left");
	const [theme, toggleTheme] = useResolvedTheme();

	return (
		<div class="app">
			<TopBar badge="Demo">
				<ThemeToggle theme={theme} onToggle={toggleTheme} />
				<a class="button" href="/">
					Sign in
				</a>
			</TopBar>
			<main class="main">
				<SchedulePanel
					side={side}
					onSideChange={setSide}
					data={schedules[side]}
					onChange={(data) =>
						setSchedules((previous) => ({ ...previous, [side]: data }))
					}
					now={DEMO_NOW}
					theme={theme}
					status={
						<>
							<LiveReading active current={DEMO_NOW.temperature} target={15} />
							<span class="save-status">Changes aren't saved</span>
						</>
					}
				/>
			</main>
		</div>
	);
}
