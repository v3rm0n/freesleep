import type { ComponentChildren, JSX } from "preact";
import { useEffect, useState } from "preact/hooks";
import type { Side } from "../server/eightsleep_api/model/index.ts";
import {
	formatTemperature,
	Graph,
	type NowMarker,
	type Schedule,
	type Temperature,
} from "./Graph.tsx";
import {
	formatNightLength,
	MIN_NIGHT_MINUTES,
	minutesAfter,
	NIGHT_STEP_MINUTES,
	nightOf,
} from "./night.ts";
import PaperProvider from "./Paper.tsx";
import {
	changeNight,
	loadPreset,
	matchingPreset,
	PRESETS,
	temperatureRange,
} from "./presets.ts";
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

interface PresetsProps {
	data: Schedule;
	onChange: (data: Schedule) => void;
}

/**
 * One-click starting curves, loaded into the side's own bedtime and wake-up.
 * The preset the schedule still matches shows as pressed; dragging a handle
 * afterwards releases it.
 */
const Presets = ({ data, onChange }: PresetsProps) => {
	const active = matchingPreset(data);
	return (
		<fieldset class="presets">
			<legend class="visually-hidden">Presets</legend>
			<span class="presets-label" aria-hidden="true">
				Presets
			</span>
			{PRESETS.map((preset) => {
				const { min, max } = temperatureRange(preset.schedule);
				return (
					<button
						key={preset.id}
						type="button"
						class="preset"
						aria-pressed={active?.id === preset.id}
						title={preset.description}
						onClick={() => onChange(loadPreset(preset, data))}
					>
						<span class="preset-name">{preset.name}</span>{" "}
						<span class="preset-range">
							{min}–{formatTemperature(max)}
						</span>
					</button>
				);
			})}
		</fieldset>
	);
};

interface NightRangeProps {
	data: Schedule;
	onChange: (data: Schedule) => void;
}

const TIME_PATTERN = /^\d{2}:\d{2}$/;

/**
 * Bedtime and wake-up — the schedule's first and last point — with the length
 * of the night between them. Moving either end stretches the curve to fit.
 */
const NightRange = ({ data, onChange }: NightRangeProps) => {
	const night = data.length >= 2 ? nightOf(data) : null;
	// Why the last change was refused; shown in place of the night's length.
	const [refusal, setRefusal] = useState<string | null>(null);
	// A refusal is about one attempt; drop it once the schedule moves on.
	useEffect(() => setRefusal(null), [data]);
	if (!night) {
		return null;
	}

	const changeEdge =
		(edge: "start" | "end") => (event: JSX.TargetedEvent<HTMLInputElement>) => {
			const input = event.currentTarget;
			// Cleared, or a browser without a time field sending free text.
			if (!TIME_PATTERN.test(input.value)) {
				input.value = night[edge];
				return;
			}
			const start = edge === "start" ? input.value : night.start;
			const end = edge === "end" ? input.value : night.end;
			if (start === night.start && end === night.end) {
				return;
			}
			if (minutesAfter(start, end) < MIN_NIGHT_MINUTES) {
				// The input is controlled, but its prop has not changed, so put the
				// old time back by hand.
				input.value = night[edge];
				setRefusal(
					`Keep at least ${formatNightLength(MIN_NIGHT_MINUTES)} between bedtime and wake-up.`,
				);
				return;
			}
			setRefusal(null);
			onChange(changeNight(data, start, end));
		};

	return (
		<fieldset class="night">
			<legend class="visually-hidden">Sleep time</legend>
			<label class="night-edge">
				<span>Bedtime</span>
				<input
					type="time"
					value={night.start}
					step={NIGHT_STEP_MINUTES * 60}
					onChange={changeEdge("start")}
				/>
			</label>
			{refusal ? (
				<span class="night-length night-length--refused" role="alert">
					{refusal}
				</span>
			) : (
				<span class="night-length" title="Length of the night">
					{formatNightLength(night.minutes)}
				</span>
			)}
			<label class="night-edge night-edge--wake">
				<span>Wake up</span>
				<input
					type="time"
					value={night.end}
					step={NIGHT_STEP_MINUTES * 60}
					onChange={changeEdge("end")}
				/>
			</label>
		</fieldset>
	);
};

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

/** The graph with its toolbar, bedtime and wake-up, presets and usage hint. */
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
		<NightRange key={side} data={data} onChange={onChange} />
		<Presets data={data} onChange={onChange} />
		<p class="hint">
			Drag a handle to change its temperature.{" "}
			<span class="nowrap">Double-click</span> or{" "}
			<span class="nowrap">double-tap</span> an empty spot to add a point, or a
			handle to remove it.
		</p>
	</section>
);
