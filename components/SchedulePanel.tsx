import type { ComponentChildren } from "preact";
import type { Side } from "../server/eightsleep_api/model/index.ts";
import {
	formatTemperature,
	Graph,
	type NowMarker,
	type Schedule,
	type Temperature,
} from "./Graph.tsx";
import PaperProvider from "./Paper.tsx";
import type { Theme } from "./theme.ts";

export const SIDES: readonly Side[] = ["left", "right"];

export const SIDE_LABELS: Record<Side, string> = {
	left: "Left",
	right: "Right",
};

interface SideToggleProps {
	side: Side;
	onChange: (side: Side) => void;
}

/** Segmented control picking the side of the bed being edited. */
export const SideToggle = ({ side, onChange }: SideToggleProps) => (
	<fieldset class="segmented">
		<legend class="visually-hidden">Side of the bed</legend>
		{SIDES.map((candidate) => (
			<button
				key={candidate}
				type="button"
				aria-pressed={side === candidate}
				onClick={() => onChange(candidate)}
			>
				{SIDE_LABELS[candidate]}
			</button>
		))}
	</fieldset>
);

interface LiveReadingProps {
	/** Whether the pod is running on this side. */
	active: boolean;
	current: Temperature;
	target: Temperature;
}

/** The pod's live reading for the selected side. */
export const LiveReading = ({ active, current, target }: LiveReadingProps) => (
	<span class="live" title="Refreshes every minute while the page is open">
		<span
			class={active ? "live-dot" : "live-dot live-dot--off"}
			aria-hidden="true"
		/>
		{active ? (
			<span>
				Pod at <strong>{formatTemperature(current)}</strong> · target{" "}
				{formatTemperature(target)}
			</span>
		) : (
			<span>
				Pod off · <strong>{formatTemperature(current)}</strong>
			</span>
		)}
	</span>
);

interface SchedulePanelProps {
	side: Side;
	onSideChange: (side: Side) => void;
	data: Schedule;
	onChange: (data: Schedule) => void;
	now?: NowMarker;
	theme: Theme;
	/** Status shown next to the side toggle (live reading, save state). */
	status?: ComponentChildren;
}

/** The graph with its toolbar and usage hint. */
export const SchedulePanel = ({
	side,
	onSideChange,
	data,
	onChange,
	now,
	theme,
	status,
}: SchedulePanelProps) => (
	<section class="panel" aria-label="Temperature schedule">
		<div class="toolbar">
			<SideToggle side={side} onChange={onSideChange} />
			{status && <div class="toolbar-status">{status}</div>}
		</div>
		<PaperProvider>
			<Graph
				data={data}
				onChange={onChange}
				now={now}
				theme={theme}
				label={`${SIDE_LABELS[side]} side`}
				key={`${side}-${data.length}-graph`}
			/>
		</PaperProvider>
		<p class="hint">
			Drag a handle to change its temperature.{" "}
			<span class="nowrap">Double-click</span> or{" "}
			<span class="nowrap">double-tap</span> an empty spot to add a point, or a
			handle to remove it.
		</p>
	</section>
);
