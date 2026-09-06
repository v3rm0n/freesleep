import type * as paper from "paper";
import { useEffect, useRef } from "preact/hooks";
import { minimumTemperature } from "../server/constants.ts";
import { usePaper } from "./Paper.tsx";
import type { Theme } from "./theme.ts";

export type Time = string;
export type Temperature = number;

/** A side's schedule: a wall-clock time and a temperature per point. */
export type Schedule = [Time, Temperature][];

export interface NowMarker {
	time: Time;
	temperature: Temperature;
}

interface GraphProps {
	data: Schedule;
	onChange?: (data: Schedule) => void;
	/** Live reading: where we are in the night and the pod's current temperature. */
	now?: NowMarker;
	theme?: Theme;
	/** What the schedule belongs to (e.g. "Left side"), for assistive technology. */
	label?: string;
}

/** The curve shown for a side that has no saved schedule yet. */
export const DEFAULT_SCHEDULE: Schedule = [
	["22:00", 18.5],
	["00:00", 16.2],
	["02:00", 15.0],
	["04:00", 14.8],
	["06:00", 16.5],
	["08:00", 19.0],
];

// Sleep schedules run from the evening across midnight into the morning. Times
// before this hour belong to the morning of the following day.
export const NIGHT_CROSSOVER_HOUR = 12;

const MINUTES_PER_DAY = 24 * 60;

const pad2 = (n: number) => n.toString().padStart(2, "0");

/** Formats a wall-clock time as "HH:MM". */
export const formatTime = (date: Date): Time =>
	`${pad2(date.getHours())}:${pad2(date.getMinutes())}`;

// Map a "HH:MM" to minutes on the continuous night axis so before-noon times
// sort after late-evening ones.
const nightMinutes = (time: Time): number => {
	const [h, m] = time.split(":").map(Number);
	const mins = h * 60 + m;
	return h < NIGHT_CROSSOVER_HOUR ? mins + MINUTES_PER_DAY : mins;
};
const minutesToTime = (mins: number): Time => {
	const wrapped =
		((Math.round(mins) % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
	return `${pad2(Math.floor(wrapped / 60))}:${pad2(wrapped % 60)}`;
};

const MIN_POINTS = 2;
const MAX_POINTS = 12;

// The scene is authored in a fixed 400×300 space and scaled to the canvas.
const SCENE_WIDTH = 400;
const SCENE_HEIGHT = 300;
const AXIS_LEFT_X = 25;
const AXIS_RIGHT_X = 375;
const AXIS_TOP_Y = 30;
const AXIS_BOTTOM_Y = 275;

// Temperature range the graph can display. Eight Sleep levels reach 44 °C, but
// the UI deliberately offers the sleeping range only.
export const GRAPH_MIN_TEMPERATURE = minimumTemperature;
export const GRAPH_MAX_TEMPERATURE = 30;
const GRAPH_TEMPERATURE_SPAN = GRAPH_MAX_TEMPERATURE - GRAPH_MIN_TEMPERATURE;
const AXIS_HEIGHT = AXIS_BOTTOM_Y - AXIS_TOP_Y;

const clampTemperature = (t: number) =>
	Math.max(GRAPH_MIN_TEMPERATURE, Math.min(GRAPH_MAX_TEMPERATURE, t));
const snapTemperature = (t: number) => Math.round(t * 2) / 2; // 0.5°C steps
const roundTemperature = (t: number) => Math.round(t * 10) / 10;

/** Formats a temperature for display, e.g. "16.5°". */
export const formatTemperature = (t: Temperature): string =>
	`${roundTemperature(t)}°`;
const temperatureToY = (temp: number): number =>
	AXIS_BOTTOM_Y -
	((temp - GRAPH_MIN_TEMPERATURE) / GRAPH_TEMPERATURE_SPAN) * AXIS_HEIGHT;
const yToTemperature = (y: number): number =>
	GRAPH_MIN_TEMPERATURE +
	((AXIS_BOTTOM_Y - y) / AXIS_HEIGHT) * GRAPH_TEMPERATURE_SPAN;

// Horizontal gridlines (and their labels) within the displayed range.
const GRID_TEMPERATURES = [15, 20, 25, 30];

// Below this (unscaled) y the fill/line gradient is fully "cold".
const GRADIENT_COLD_Y = 170;
// Double-clicking within this (unscaled) distance of a handle removes it.
const REMOVE_HIT_DISTANCE = 16;

/** Evenly spaced x positions for `count` schedule points. */
const getXPositions = (count: number): number[] => {
	if (count === 1) return [SCENE_WIDTH / 2];
	const spacing = (AXIS_RIGHT_X - AXIS_LEFT_X) / (count - 1);
	return Array.from({ length: count }, (_, i) => AXIS_LEFT_X + i * spacing);
};

/** Index of the position closest to `x`. */
const nearestIndex = (positions: number[], x: number): number => {
	let nearest = 0;
	for (let i = 1; i < positions.length; i++) {
		if (Math.abs(positions[i] - x) < Math.abs(positions[nearest] - x)) {
			nearest = i;
		}
	}
	return nearest;
};

interface Palette {
	grid: paper.Color;
	axis: paper.Color;
	axisLabel: paper.Color;
	timeLabel: paper.Color;
	tempLabel: paper.Color;
	nodeFill: paper.Color;
	nodeStroke: paper.Color;
	lineGlow: paper.Color;
	nodeGlow: paper.Color;
	nodeGlowActive: paper.Color;
	now: paper.Color;
	fillAlpha: number;
}

interface ReferenceLabels {
	time: paper.PointText;
	temperature: paper.PointText;
}

export const Graph = ({
	data,
	onChange,
	now,
	theme = "dark",
	label,
}: GraphProps) => {
	const { paper } = usePaper();
	// Latest props for the paper.js handlers, which are bound once per scene.
	const dataRef = useRef(data);
	dataRef.current = data;
	const onChangeRef = useRef(onChange);
	onChangeRef.current = onChange;

	const graphRef = useRef<paper.Path | null>(null);
	const lineRef = useRef<paper.Path | null>(null);
	const nodeItemsRef = useRef<paper.Path[]>([]);
	const nodesGroupRef = useRef<paper.Group | null>(null);
	const xAxisRef = useRef<paper.Path | null>(null);
	const referenceLinesRef = useRef<paper.Group | null>(null);
	const referenceLabelsRef = useRef<ReferenceLabels[]>([]);
	const allElementsRef = useRef<paper.Group | null>(null);
	const nowGroupRef = useRef<paper.Group | null>(null);
	const paletteRef = useRef<Palette | null>(null);
	const curveSegmentsRef = useRef<paper.Segment[]>([]);
	const scaleRef = useRef<{ x: number; y: number }>({ x: 1, y: 1 });
	// Set when a structural/drag change drives an onChange so the controlled
	// re-render doesn't replay the load tween.
	const skipTweenRef = useRef(false);
	const dragStateRef = useRef({ isDragging: false, moved: false });

	const buildPalette = (): Palette =>
		theme === "light"
			? {
					grid: new paper.Color(0, 0, 0, 0.1),
					axis: new paper.Color(0, 0, 0, 0.22),
					axisLabel: new paper.Color(0, 0, 0, 0.45),
					timeLabel: new paper.Color(0, 0, 0, 0.55),
					tempLabel: new paper.Color(0, 0, 0, 0.85),
					nodeFill: new paper.Color(1, 1, 1, 1),
					nodeStroke: new paper.Color(0, 0, 0, 0.5),
					lineGlow: new paper.Color(0, 0, 0, 0.18),
					nodeGlow: new paper.Color(0, 0, 0, 0.22),
					nodeGlowActive: new paper.Color(0, 0, 0, 0.5),
					now: new paper.Color(0.0, 0.42, 0.85),
					fillAlpha: 0.5,
				}
			: {
					grid: new paper.Color(1, 1, 1, 0.08),
					axis: new paper.Color(1, 1, 1, 0.18),
					axisLabel: new paper.Color(1, 1, 1, 0.4),
					timeLabel: new paper.Color(1, 1, 1, 0.45),
					tempLabel: new paper.Color(1, 1, 1, 0.92),
					nodeFill: new paper.Color(1, 1, 1, 0.97),
					nodeStroke: new paper.Color(0, 0, 0, 0.35),
					lineGlow: new paper.Color(1, 1, 1, 0.25),
					nodeGlow: new paper.Color(1, 1, 1, 0.45),
					nodeGlowActive: new paper.Color(1, 1, 1, 0.85),
					now: new paper.Color(0.55, 0.85, 1.0),
					fillAlpha: 0.45,
				};

	// Scale the whole scene from the authored 400×300 space to the canvas size.
	const rescale = (size: paper.Size) => {
		if (!allElementsRef.current) return;
		const newXScale = size.width / SCENE_WIDTH;
		const newYScale = size.height / SCENE_HEIGHT;
		allElementsRef.current.scale(
			newXScale / scaleRef.current.x,
			newYScale / scaleRef.current.y,
			[0, 0],
		);
		scaleRef.current = { x: newXScale, y: newYScale };
	};

	// Unscaled x of a schedule point, by its position in the current data.
	const timeToX = (time: Time): number => {
		const times = dataRef.current.map(([t]) => t);
		const index = times.indexOf(time);
		return getXPositions(times.length)[index === -1 ? 0 : index] ?? AXIS_LEFT_X;
	};

	// Time of the schedule point nearest to an unscaled x.
	const xToTime = (x: number): Time => {
		const current = dataRef.current;
		if (current.length === 0) return "00:00";
		return current[nearestIndex(getXPositions(current.length), x)][0];
	};

	// Position of a wall-clock time on the (unscaled) x-axis, interpolated within
	// whichever pair of schedule points brackets it. Returns null when the time
	// falls outside the scheduled window.
	const timeToFractionalX = (time: Time): number | null => {
		const current = dataRef.current;
		if (current.length < 2) return null;
		const positions = getXPositions(current.length);
		const minutes = current.map(([t]) => nightMinutes(t));
		const target = nightMinutes(time);
		if (target < minutes[0] || target > minutes[minutes.length - 1])
			return null;
		for (let i = 0; i < minutes.length - 1; i++) {
			if (target >= minutes[i] && target <= minutes[i + 1]) {
				const span = minutes[i + 1] - minutes[i];
				const frac = span === 0 ? 0 : (target - minutes[i]) / span;
				return positions[i] + frac * (positions[i + 1] - positions[i]);
			}
		}
		return null;
	};

	// Re-derive everything that follows the curve: smoothing, gradients, the top
	// line, the handles and the per-point labels.
	const refreshGraph = () => {
		const graph = graphRef.current;
		const xAxis = xAxisRef.current;
		const referenceLines = referenceLinesRef.current;
		if (!graph || !xAxis || !referenceLines) return;

		const curveSegments = curveSegmentsRef.current;
		const fillAlpha = paletteRef.current?.fillAlpha ?? 0.45;
		const scaleY = scaleRef.current.y;

		// Smoothen
		for (let i = 0; i < graph.segments.length; i++) {
			if (i > 0 && i < curveSegments.length - 1) {
				graph.segments[i].smooth({ type: "catmull-rom" });
			} else {
				// paper.js types only expose `smooth` as a method; the original
				// clears smoothing on endpoints by overwriting it. Preserve that.
				(graph.segments[i] as unknown as { smooth: boolean }).smooth = false;
			}
		}

		if (curveSegments.length === 0) {
			return;
		}

		// Build two matching horizontal gradients from the per-point temperature:
		// a soft translucent one for the area fill and a crisp opaque one for the
		// top line. Warm hues sit where the curve is high, cool hues where it dips.
		const fillStops: paper.GradientStop[] = [];
		const lineStops: paper.GradientStop[] = [];
		const xStart = curveSegments[0].point.x;
		const xEnd = curveSegments[curveSegments.length - 1].point.x;
		const xRange = xEnd - xStart || 1;

		const hot = new paper.Color(1.0, 0.45, 0.22); // coral – warmest
		const neutral = new paper.Color(0.62, 0.36, 0.95); // violet – mid
		const cold = new paper.Color(0.2, 0.55, 1.0); // azure – coolest

		for (const segment of curveSegments) {
			const point = segment.point;
			const t = Math.max(0, Math.min(1, point.y / (GRADIENT_COLD_Y * scaleY)));

			let r: number, g: number, b: number, f: number;

			if (t < 0.5) {
				f = t / 0.5;
				r = hot.red + (neutral.red - hot.red) * f;
				g = hot.green + (neutral.green - hot.green) * f;
				b = hot.blue + (neutral.blue - hot.blue) * f;
			} else {
				f = (t - 0.5) / 0.5;
				r = neutral.red + (cold.red - neutral.red) * f;
				g = neutral.green + (cold.green - neutral.green) * f;
				b = neutral.blue + (cold.blue - neutral.blue) * f;
			}

			const offset = (point.x - xStart) / xRange;
			fillStops.push(
				new paper.GradientStop(new paper.Color(r, g, b, fillAlpha), offset),
			);
			lineStops.push(
				new paper.GradientStop(new paper.Color(r, g, b, 1), offset),
			);
		}

		const fillGradient = new paper.Gradient();
		fillGradient.stops = fillStops;
		graph.fillColor = new paper.Color(fillGradient, [xStart, 0], [xEnd, 0]);

		const line = lineRef.current;
		if (line && lineStops.length > 1) {
			const lineGradient = new paper.Gradient();
			lineGradient.stops = lineStops;
			line.strokeColor = new paper.Color(lineGradient, [xStart, 0], [xEnd, 0]);
		}

		referenceLines.sendToBack();
		xAxis.bringToFront();

		// Glue the crisp top line and the node handles to the (smoothed) curve.
		if (line) {
			for (let i = 0; i < line.segments.length; i++) {
				const src = graph.segments[i];
				line.segments[i].point = src.point.clone();
				line.segments[i].handleIn = src.handleIn.clone();
				line.segments[i].handleOut = src.handleOut.clone();
			}
			line.bringToFront();
		}
		for (let i = 0; i < nodeItemsRef.current.length; i++) {
			nodeItemsRef.current[i].position = graph.segments[i].point.clone();
		}
		nodesGroupRef.current?.bringToFront();
		nowGroupRef.current?.bringToFront();

		// Per-point readouts: the temperature above, the time below.
		const labels = referenceLabelsRef.current;
		const current = dataRef.current;
		curveSegments.forEach((segment, index) => {
			const label = labels[index];
			if (!label) return;
			label.temperature.content = formatTemperature(
				yToTemperature(segment.point.y / scaleY),
			);
			if (current[index]) {
				label.time.content = current[index][0];
			}
		});
	};

	// Build (or rebuild) the whole scene. Re-runs on theme change; the handlers
	// read the latest `data`/`onChange` through refs, so they never go stale.
	useEffect(() => {
		// Clean up existing objects
		if (allElementsRef.current) {
			allElementsRef.current.remove();
		}
		nowGroupRef.current = null;

		const palette = buildPalette();
		paletteRef.current = palette;
		scaleRef.current = { x: 1, y: 1 };

		const initial = dataRef.current;
		const xPositions = getXPositions(initial.length);

		// The filled area: the curve plus a baseline back along the axis.
		const graphSegments: [number, number][] = initial.map(
			([, temperature], i) => [xPositions[i], temperatureToY(temperature)],
		);
		graphSegments.push([xPositions[xPositions.length - 1], AXIS_BOTTOM_Y]);
		graphSegments.push([xPositions[0], AXIS_BOTTOM_Y]);

		const graph = new paper.Path({
			segments: graphSegments,
			closed: true,
		});
		graphRef.current = graph;
		curveSegmentsRef.current = graph.segments.slice(0, xPositions.length);

		// Crisp top line drawn over the translucent fill. It's an open path with no
		// baseline; refreshGraph keeps its points/handles synced to the curve.
		const line = new paper.Path({
			segments: initial.map(([, temperature], i) => [
				xPositions[i],
				temperatureToY(temperature),
			]),
			strokeWidth: 3,
			strokeCap: "round",
			strokeJoin: "round",
		});
		line.shadowColor = palette.lineGlow;
		line.shadowBlur = 8;
		lineRef.current = line;

		// Visible draggable handles so it's obvious the curve can be dragged.
		const nodeItems = initial.map(([, temperature], i) => {
			const node = new paper.Path.Circle({
				center: [xPositions[i], temperatureToY(temperature)],
				radius: 5,
			});
			node.fillColor = palette.nodeFill;
			node.strokeColor = palette.nodeStroke;
			node.strokeWidth = 1.5;
			node.shadowColor = palette.nodeGlow;
			node.shadowBlur = 6;
			return node;
		});
		nodeItemsRef.current = nodeItems;
		const nodesGroup = new paper.Group(nodeItems);
		nodesGroupRef.current = nodesGroup;

		const xAxis = new paper.Path({
			segments: [
				[xPositions[0], AXIS_BOTTOM_Y],
				[xPositions[xPositions.length - 1], AXIS_BOTTOM_Y],
			],
			strokeColor: palette.axis,
			strokeWidth: 1,
		});
		xAxisRef.current = xAxis;

		// One dashed reference line per point, with its readouts (the contents
		// are filled in by refreshGraph).
		const referenceLabels: ReferenceLabels[] = [];
		const referenceLineElements = xPositions.map((x) => {
			const referenceLine = new paper.Path({
				segments: [
					[x, AXIS_TOP_Y - 10],
					[x, AXIS_BOTTOM_Y + 3],
				],
				strokeColor: palette.grid,
				strokeWidth: 1,
				strokeJoin: "round",
				strokeCap: "round",
				dashArray: [2, 6],
			});
			const temperature = new paper.PointText({
				point: [x, AXIS_TOP_Y - 18],
				content: "",
				fillColor: palette.tempLabel,
				fontSize: 11,
				fontWeight: "600",
				justification: "center",
			});
			const time = new paper.PointText({
				point: [x, AXIS_BOTTOM_Y + 17],
				content: "",
				fillColor: palette.timeLabel,
				fontSize: 10,
				justification: "center",
			});
			referenceLabels.push({ time, temperature });
			return new paper.Group([referenceLine, time, temperature]);
		});
		referenceLabelsRef.current = referenceLabels;
		const referenceLines = new paper.Group(referenceLineElements);
		referenceLinesRef.current = referenceLines;

		// Horizontal gridlines with temperature labels, so the empty part of the
		// plot reads as a scale rather than as a void.
		const gridElements = GRID_TEMPERATURES.map((temperature) => {
			const y = temperatureToY(temperature);
			const gridLine = new paper.Path({
				segments: [
					[AXIS_LEFT_X, y],
					[AXIS_RIGHT_X, y],
				],
				strokeColor: palette.grid,
				strokeWidth: 1,
			});
			const gridLabel = new paper.PointText({
				// Nudged down so the label centres on its line.
				point: [AXIS_LEFT_X - 6, y + 3.5],
				content: `${temperature}`,
				justification: "right",
				fillColor: palette.axisLabel,
				fontSize: 10,
			});
			return new paper.Group([gridLine, gridLabel]);
		});
		const grid = new paper.Group(gridElements);

		// Group all elements (back-to-front; refreshGraph re-asserts z-order)
		const allElements = new paper.Group([
			grid,
			referenceLines,
			graph,
			line,
			xAxis,
			nodesGroup,
		]);
		allElementsRef.current = allElements;

		// Visually emphasise whichever handle is being dragged.
		const setActiveNode = (activeIndex: number) => {
			nodeItemsRef.current.forEach((node, i) => {
				const active = i === activeIndex;
				node.shadowBlur = active ? 16 : 6;
				node.shadowColor = active ? palette.nodeGlowActive : palette.nodeGlow;
			});
		};

		const onMouseDown = () => {
			dragStateRef.current = { isDragging: true, moved: false };
		};

		// Drag anywhere: the handle nearest to the cursor's x follows its y.
		const onMouseDrag = (event: paper.MouseEvent) => {
			const curveSegments = curveSegmentsRef.current;
			if (curveSegments.length === 0) return;
			const scaleY = scaleRef.current.y;

			const index = nearestIndex(
				curveSegments.map((segment) => segment.point.x),
				event.point.x,
			);
			dragStateRef.current.moved = true;
			setActiveNode(index);

			// Clamp to the displayed range and snap to 0.5°C steps.
			const temperature = snapTemperature(
				clampTemperature(yToTemperature(event.point.y / scaleY)),
			);
			curveSegments[index].point.y = temperatureToY(temperature) * scaleY;
			refreshGraph();
		};

		const onMouseUp = () => {
			const { isDragging, moved } = dragStateRef.current;
			const onChange = onChangeRef.current;

			// Only persist when a handle actually moved (ignore plain clicks).
			if (isDragging && moved && onChange) {
				const { x: scaleX, y: scaleY } = scaleRef.current;
				const updatedData: [Time, Temperature][] = curveSegmentsRef.current.map(
					(segment) => [
						xToTime(segment.point.x / scaleX),
						roundTemperature(yToTemperature(segment.point.y / scaleY)),
					],
				);
				skipTweenRef.current = true;
				onChange(updatedData);
			}

			dragStateRef.current = { isDragging: false, moved: false };
			setActiveNode(-1);
		};

		// Double-click a handle to remove it, or an empty gap to add a point.
		const onDoubleClick = (event: paper.MouseEvent) => {
			const onChange = onChangeRef.current;
			const current = dataRef.current;
			if (!onChange || current.length === 0) return;
			const ux = event.point.x / scaleRef.current.x;
			const uy = event.point.y / scaleRef.current.y;
			const positions = getXPositions(current.length);
			const nearest = nearestIndex(positions, ux);

			// Remove the point under the cursor (keep at least MIN_POINTS).
			if (
				Math.abs(positions[nearest] - ux) < REMOVE_HIT_DISTANCE &&
				current.length > MIN_POINTS
			) {
				skipTweenRef.current = true;
				onChange(current.filter((_, i) => i !== nearest));
				return;
			}

			// Otherwise insert a point in the gap the cursor sits in.
			if (current.length >= MAX_POINTS) return;
			if (ux <= positions[0] || ux >= positions[positions.length - 1]) return;
			let gap = 0;
			for (let i = 0; i < positions.length - 1; i++) {
				if (ux >= positions[i] && ux <= positions[i + 1]) {
					gap = i;
					break;
				}
			}
			const time = minutesToTime(
				(nightMinutes(current[gap][0]) + nightMinutes(current[gap + 1][0])) / 2,
			);
			const temperature = snapTemperature(clampTemperature(yToTemperature(uy)));
			skipTweenRef.current = true;
			onChange([
				...current.slice(0, gap + 1),
				[time, temperature],
				...current.slice(gap + 1),
			]);
		};

		const onResize = (event: { size: paper.Size }) => {
			rescale(event.size);
		};

		paper.view.onMouseDown = onMouseDown;
		paper.view.onMouseDrag = onMouseDrag;
		paper.view.onMouseUp = onMouseUp;
		paper.view.onDoubleClick = onDoubleClick;
		paper.view.onResize = onResize;

		// Initial setup
		rescale(paper.view.size);
		refreshGraph();

		// Cleanup function
		return () => {
			paper.view.onMouseDown = null;
			paper.view.onMouseDrag = null;
			paper.view.onMouseUp = null;
			paper.view.onDoubleClick = null;
			paper.view.onResize = null;
			if (allElementsRef.current) {
				allElementsRef.current.remove();
			}
		};
	}, [paper, theme]);

	// Update graph when data changes (controlled component → animate to new data).
	useEffect(() => {
		if (data.length === 0) return;
		const graph = graphRef.current;
		if (!graph) return;

		// Structural changes are handled by a remount (key includes length).
		if (data.length !== curveSegmentsRef.current.length) return;

		// A change we just produced (drag / add / remove) needs no animation.
		if (skipTweenRef.current) {
			skipTweenRef.current = false;
			refreshGraph();
			return;
		}

		// Respect the motion preference: jump to the new curve instead of tweening.
		if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
			data.forEach(([time, temperature], i) => {
				graph.segments[i].point = new paper.Point(
					timeToX(time) * scaleRef.current.x,
					temperatureToY(temperature) * scaleRef.current.y,
				);
			});
			refreshGraph();
			return;
		}

		const tweenTo: Record<string, number> = {};
		data.forEach(([time, temperature], i) => {
			tweenTo[`segments[${i}].point.x`] = timeToX(time) * scaleRef.current.x;
			tweenTo[`segments[${i}].point.y`] =
				temperatureToY(temperature) * scaleRef.current.y;
		});

		const elasticEaseOut = (t: number) => {
			const c4 = (2 * Math.PI) / 3;
			return t === 0
				? 0
				: t === 1
					? 1
					: 2 ** (-10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
		};

		const tween = graph.tween(tweenTo, {
			duration: 1000,
			easing: elasticEaseOut,
			start: false,
		});

		tween.onUpdate = () => {
			refreshGraph();
		};

		tween.start();
	}, [data]);

	// Describe the schedule for assistive technology; the canvas itself is
	// opaque to screen readers.
	useEffect(() => {
		const element = paper.view.element;
		if (!element) return;
		const points = data
			.map(([time, temperature]) => `${time} ${formatTemperature(temperature)}`)
			.join(", ");
		const subject = label
			? `${label} temperature schedule`
			: "Temperature schedule";
		element.setAttribute("aria-label", `${subject}: ${points}`);
	}, [paper, data, label]);

	// Live "now" indicator: a vertical marker at the current time with the pod's
	// current temperature. Redrawn when the reading, the schedule's times, the
	// theme, or the paper scope change.
	const timesKey = data.map(([time]) => time).join(",");
	useEffect(() => {
		nowGroupRef.current?.remove();
		nowGroupRef.current = null;

		const palette = paletteRef.current;
		const parent = allElementsRef.current;
		if (!now || !palette || !parent) return;

		const fx = timeToFractionalX(now.time);
		if (fx === null) return;

		// The axis only spans the sleeping range: pin the marker to its edge but
		// label the real reading.
		const y = temperatureToY(clampTemperature(now.temperature));
		const accent = palette.now;

		const lineColor = accent.clone();
		lineColor.alpha = 0.6;
		const verticalLine = new paper.Path({
			segments: [
				[fx, AXIS_TOP_Y - 8],
				[fx, AXIS_BOTTOM_Y + 3],
			],
			strokeColor: lineColor,
			strokeWidth: 1.5,
			dashArray: [3, 4],
		});

		const marker = new paper.Path.Circle({ center: [fx, y], radius: 4.5 });
		marker.fillColor = accent;
		marker.shadowColor = accent;
		marker.shadowBlur = 10;

		// Label sits just above its marker so it never collides with the per-point
		// readouts along the top edge.
		const labelPoint = new paper.PointText({
			point: [fx, Math.max(AXIS_TOP_Y - 6, y - 12)],
			content: `now ${formatTemperature(now.temperature)}`,
			fillColor: accent,
			fontSize: 10,
			fontWeight: "600",
			justification: fx < 60 ? "left" : fx > 340 ? "right" : "center",
		});

		const nowGroup = new paper.Group([verticalLine, marker, labelPoint]);
		// Items are authored in unscaled (400×300) space; bring them into the
		// already-scaled coordinate system the rest of allElements lives in.
		nowGroup.scale(scaleRef.current.x, scaleRef.current.y, [0, 0]);
		parent.addChild(nowGroup);
		nowGroup.bringToFront();
		nowGroupRef.current = nowGroup;

		return () => {
			nowGroupRef.current?.remove();
			nowGroupRef.current = null;
		};
	}, [paper, theme, now?.time, now?.temperature, timesKey]);

	return null;
};
