import type * as paper from "paper";
import { useEffect, useRef } from "preact/hooks";
import { usePaper } from "./Paper.tsx";

export type Time = string;
export type Temperature = number;

export type GraphTheme = "dark" | "light";

export interface NowMarker {
	time: Time;
	temperature: Temperature;
}

interface GraphProps {
	data: [Time, Temperature][];
	onChange?: (data: [Time, Temperature][]) => void;
	/** Live reading: where we are in the night and the pod's current temperature. */
	now?: NowMarker;
	theme?: GraphTheme;
}

// Sleep schedules run from the evening across midnight into the morning. Map a
// "HH:MM" to minutes on that continuous night axis so before-noon times sort
// after late-evening ones.
const pad2 = (n: number) => n.toString().padStart(2, "0");
const nightMinutes = (time: Time): number => {
	const [h, m] = time.split(":").map(Number);
	const mins = h * 60 + m;
	return h < 12 ? mins + 24 * 60 : mins;
};
const minutesToTime = (mins: number): Time => {
	const wrapped = ((Math.round(mins) % (24 * 60)) + 24 * 60) % (24 * 60);
	return `${pad2(Math.floor(wrapped / 60))}:${pad2(wrapped % 60)}`;
};

const MIN_POINTS = 2;
const MAX_POINTS = 12;
const snapTemperature = (t: number) => Math.round(t * 2) / 2; // 0.5°C steps

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

export const Graph = ({ data, onChange, now, theme = "dark" }: GraphProps) => {
	const { paper } = usePaper();
	const graphRef = useRef<paper.Path | null>(null);
	const lineRef = useRef<paper.Path | null>(null);
	const nodeItemsRef = useRef<paper.Path[]>([]);
	const nodesGroupRef = useRef<paper.Group | null>(null);
	const xAxisRef = useRef<paper.Path | null>(null);
	const referenceLinesRef = useRef<paper.Group | null>(null);
	const allElementsRef = useRef<paper.Group | null>(null);
	const nowGroupRef = useRef<paper.Group | null>(null);
	const paletteRef = useRef<Palette | null>(null);
	const curveSegmentsRef = useRef<paper.Segment[]>([]);
	const scaleRef = useRef<{ x: number; y: number }>({ x: 1, y: 1 });
	// Set when a structural/drag change drives an onChange so the controlled
	// re-render doesn't replay the load tween.
	const skipTweenRef = useRef(false);
	const dragStateRef = useRef<{
		isDragging: boolean;
		moved: boolean;
		changedPoints: Map<string, number>;
	}>({
		isDragging: false,
		moved: false,
		changedPoints: new Map(),
	});

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

	// Rescale function - moved outside useEffects to be accessible by both
	const rescale = (size: paper.Size) => {
		if (!allElementsRef.current || !scaleRef.current) return;
		// Calculate new absolute scale factors
		const newXScale = size.width / 400;
		const newYScale = size.height / 300;
		// Apply the relative scaling
		allElementsRef.current.scale(
			newXScale / scaleRef.current.x,
			newYScale / scaleRef.current.y,
			[0, 0],
		);
		// Update the current scale factors
		scaleRef.current.x = newXScale;
		scaleRef.current.y = newYScale;
	};

	// Helper functions for coordinate conversion
	const getXPositions = (dataLength: number): number[] => {
		if (dataLength === 1) return [200]; // Center position for single point
		const startX = 25;
		const endX = 375;
		const spacing = (endX - startX) / (dataLength - 1);
		return Array.from({ length: dataLength }, (_, i) => startX + i * spacing);
	};

	const timeToX = (time: string): number => {
		if (!data || data.length === 0) return 25;
		const times = data.map(([t]) => t);
		const positions = getXPositions(data.length);
		const index = times.indexOf(time);
		return index !== -1 ? positions[index] : positions[0];
	};

	const xToTime = (x: number): string => {
		if (!data || data.length === 0) return "00:00";
		const times = data.map(([t]) => t);
		const positions = getXPositions(data.length);

		let closestIndex = 0;
		let minDistance = Math.abs(x - positions[0]);

		for (let i = 1; i < positions.length; i++) {
			const distance = Math.abs(x - positions[i]);
			if (distance < minDistance) {
				minDistance = distance;
				closestIndex = i;
			}
		}

		return times[closestIndex];
	};

	const temperatureToY = (temp: number): number => {
		// Temperature range: 13°C (y=275) to 30°C (y=30)
		// Linear interpolation: y = 275 - ((temp - 13) / 17) * 245
		return 275 - ((temp - 13) / 17) * 245;
	};

	const yToTemperature = (y: number): number => {
		// Inverse of temperatureToY
		return 13 + ((275 - y) / 245) * 17;
	};

	// Position of a wall-clock time on the (unscaled) x-axis, interpolated within
	// whichever pair of schedule points brackets it. Returns null when the time
	// falls outside the scheduled window.
	const timeToFractionalX = (time: Time): number | null => {
		if (data.length < 2) return null;
		const positions = getXPositions(data.length);
		const minutes = data.map(([t]) => nightMinutes(t));
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

	// Shared refreshGraph function that can be used by both useEffects
	const refreshGraph = () => {
		if (!graphRef.current || !xAxisRef.current || !referenceLinesRef.current)
			return;

		const graph = graphRef.current;
		const xAxis = xAxisRef.current;
		const referenceLines = referenceLinesRef.current;
		const curveSegments = curveSegmentsRef.current;
		const fillAlpha = paletteRef.current?.fillAlpha ?? 0.45;

		if (!curveSegments) return;

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

		curveSegments.forEach((segment) => {
			const point = segment.point;
			if (!scaleRef.current) return;

			let t = point.y / (170 * scaleRef.current.y);
			t = Math.max(0, Math.min(1, t));

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
		});

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

		curveSegments.forEach((segment) => {
			if (!scaleRef.current) return;
			const index = curveSegments.indexOf(segment);
			const referenceGroup = referenceLines.children[index] as paper.Group;
			if (referenceGroup?.lastChild) {
				(referenceGroup.lastChild as paper.PointText).content =
					`${Math.round(yToTemperature(segment.point.y / scaleRef.current.y) * 10) / 10}°`;
			}
		});
	};

	// Build (or rebuild) the whole scene. Re-runs on theme change; reads the
	// latest `data`/`onChange` from closure on each build.
	useEffect(() => {
		// Clean up existing objects
		if (allElementsRef.current) {
			allElementsRef.current.remove();
		}
		nowGroupRef.current = null;

		const palette = buildPalette();
		paletteRef.current = palette;
		scaleRef.current = { x: 1, y: 1 };

		// Get x positions based on data length
		const xPositions = getXPositions(data.length);

		// Create graph segments with actual data positions
		const graphSegments: [number, number][] = [];
		data.forEach(([, temperature], i) => {
			graphSegments.push([xPositions[i], temperatureToY(temperature)]);
		});
		graphSegments.push([xPositions[xPositions.length - 1], 275]); // Last point
		graphSegments.push([xPositions[0], 275]); // Back to first point

		// Create graph
		const graph = new paper.Path({
			segments: graphSegments,
			closed: true,
		});
		graphRef.current = graph;
		curveSegmentsRef.current = graph.segments.slice(0, xPositions.length);

		// Crisp top line drawn over the translucent fill. It's an open path with no
		// baseline; refreshGraph keeps its points/handles synced to the curve.
		const line = new paper.Path({
			segments: data.map(([, temperature], i) => [
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
		const nodeItems = data.map(([, temperature], i) => {
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

		// Create x-axis
		const xAxis = new paper.Path({
			segments: [
				[xPositions[0], 275],
				[xPositions[xPositions.length - 1], 275],
			],
			strokeColor: palette.axis,
			strokeWidth: 1,
		});
		xAxisRef.current = xAxis;

		// Helper function to create reference lines
		const createReferenceLine = (x: number, time: string) => {
			const referenceLine = new paper.Path({
				segments: [
					[x, 20],
					[x, 278],
				],
				strokeColor: palette.grid,
				strokeWidth: 1,
				strokeJoin: "round",
				strokeCap: "round",
				dashArray: [2, 6],
			});

			// Per-point temperature readout (content is set in refreshGraph).
			const referenceText = new paper.PointText({
				point: [x, 12],
				content: x.toString(),
				fillColor: palette.tempLabel,
				fontSize: 11,
				fontWeight: "600",
				justification: "center",
			});

			const referenceTime = new paper.PointText({
				point: [x, 292],
				content: time,
				fillColor: palette.timeLabel,
				fontSize: 10,
				justification: "center",
			});

			return new paper.Group([referenceLine, referenceTime, referenceText]);
		};

		// Create reference lines using data times
		const referenceLineElements = xPositions.map((x, index) => {
			const time = data[index][0];
			return createReferenceLine(x, time);
		});
		const referenceLines = new paper.Group(referenceLineElements);
		referenceLinesRef.current = referenceLines;

		// Create temperature labels
		const maxTemp = new paper.PointText({
			point: [20, 30],
			content: "30",
			justification: "right",
			fillColor: palette.axisLabel,
		});

		const midTemp = new paper.PointText({
			point: [20, (275 + 30) / 2],
			content: "22",
			justification: "right",
			fillColor: palette.axisLabel,
		});

		const minTemp = new paper.PointText({
			point: [20, 275],
			content: "13",
			justification: "right",
			fillColor: palette.axisLabel,
		});

		const temperatures = new paper.Group([maxTemp, midTemp, minTemp]);

		// Group all elements (back-to-front; refreshGraph re-asserts z-order)
		const allElements = new paper.Group([
			referenceLines,
			graph,
			line,
			xAxis,
			temperatures,
			nodesGroup,
		]);
		allElementsRef.current = allElements;

		// Helper function for scaled temperature conversion
		const yToTemperatureScaled = (y: number) => {
			return yToTemperature(y / scaleRef.current.y);
		};

		const closestCurveSegment = (point: paper.Point) => {
			const curveSegments = curveSegmentsRef.current;
			let closestSegment = curveSegments[0];
			let minDistance: number | undefined;
			curveSegments.forEach((segment) => {
				const distance = Math.abs(segment.point.x - point.x);
				if (distance < (minDistance || Number.MAX_VALUE)) {
					minDistance = distance;
					closestSegment = segment;
				}
			});
			return closestSegment;
		};

		// Visually emphasise whichever handle is being dragged.
		const setActiveNode = (activeIndex: number) => {
			nodeItemsRef.current.forEach((node, i) => {
				const active = i === activeIndex;
				node.shadowBlur = active ? 16 : 6;
				node.shadowColor = active ? palette.nodeGlowActive : palette.nodeGlow;
			});
		};

		// Set up event handlers
		const onMouseDown = (_event: paper.MouseEvent) => {
			dragStateRef.current.isDragging = true;
			dragStateRef.current.moved = false;
		};

		const onMouseDrag = (event: paper.MouseEvent) => {
			const segment = closestCurveSegment(event.point);

			if (!scaleRef.current) return;

			dragStateRef.current.moved = true;
			setActiveNode(curveSegmentsRef.current.indexOf(segment));

			// Convert to temperature first to apply proper bounds
			const rawY = Math.max(
				Math.min(event.point.y, 275 * scaleRef.current.y),
				25 * scaleRef.current.y,
			);
			const rawTemperature = yToTemperatureScaled(rawY);

			// Clamp to valid range (13°C to 30°C) and snap to 0.5°C steps.
			const clampedTemperature = snapTemperature(
				Math.max(13, Math.min(30, rawTemperature)),
			);

			// Convert back to Y coordinate with clamped temperature
			const newY = temperatureToY(clampedTemperature) * scaleRef.current.y;

			segment.point.y = newY;
			curveSegmentsRef.current[
				curveSegmentsRef.current.indexOf(segment)
			].point.y = newY;
			refreshGraph();

			// Store the current drag state but don't call onChange yet
			if (dragStateRef.current.isDragging) {
				const time = xToTime(segment.point.x / scaleRef.current.x);
				dragStateRef.current.changedPoints.set(time, clampedTemperature);
			}
		};

		const onMouseUp = (_event: paper.MouseEvent) => {
			if (!dragStateRef.current) return;

			// Only persist when a handle actually moved (ignore plain clicks).
			if (
				dragStateRef.current.isDragging &&
				dragStateRef.current.moved &&
				onChange
			) {
				// Create updated data array based on current segment positions
				const updatedData: [Time, Temperature][] = curveSegmentsRef.current.map(
					(segment) => {
						if (!scaleRef.current) return ["00:00", 13]; // fallback

						const time = xToTime(segment.point.x / scaleRef.current.x);
						const temperature = yToTemperature(
							segment.point.y / scaleRef.current.y,
						);
						return [time, Math.round(temperature * 10) / 10];
					},
				);

				skipTweenRef.current = true;
				onChange(updatedData);
			}

			// Reset drag state
			dragStateRef.current.isDragging = false;
			dragStateRef.current.moved = false;
			dragStateRef.current.changedPoints.clear();
			setActiveNode(-1);
		};

		// Double-click a handle to remove it, or an empty gap to add a point.
		const onDoubleClick = (event: paper.MouseEvent) => {
			if (!scaleRef.current || !onChange) return;
			const ux = event.point.x / scaleRef.current.x;
			const uy = event.point.y / scaleRef.current.y;
			const positions = getXPositions(data.length);

			let nearest = 0;
			let nearestDistance = Number.MAX_VALUE;
			positions.forEach((x, i) => {
				const distance = Math.abs(x - ux);
				if (distance < nearestDistance) {
					nearestDistance = distance;
					nearest = i;
				}
			});

			// Remove the point under the cursor (keep at least MIN_POINTS).
			if (nearestDistance < 16 && data.length > MIN_POINTS) {
				skipTweenRef.current = true;
				onChange(data.filter((_, i) => i !== nearest));
				return;
			}

			// Otherwise insert a point in the gap the cursor sits in.
			if (data.length >= MAX_POINTS) return;
			if (ux <= positions[0] || ux >= positions[positions.length - 1]) return;
			let gap = 0;
			for (let i = 0; i < positions.length - 1; i++) {
				if (ux >= positions[i] && ux <= positions[i + 1]) {
					gap = i;
					break;
				}
			}
			const time = minutesToTime(
				(nightMinutes(data[gap][0]) + nightMinutes(data[gap + 1][0])) / 2,
			);
			const temperature = snapTemperature(
				Math.max(13, Math.min(30, yToTemperature(uy))),
			);
			skipTweenRef.current = true;
			onChange([
				...data.slice(0, gap + 1),
				[time, temperature],
				...data.slice(gap + 1),
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
		if (!data || data.length === 0) return;
		if (!graphRef.current) return;

		const graph = graphRef.current;
		const curveSegments = curveSegmentsRef.current;

		// Structural changes are handled by a remount (key includes length).
		if (data.length !== curveSegments.length) return;

		// A change we just produced (drag / add / remove) needs no animation.
		if (skipTweenRef.current) {
			skipTweenRef.current = false;
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

	// Live "now" indicator: a vertical marker at the current time with the pod's
	// current temperature. Redrawn when the reading, theme, or paper scope change.
	useEffect(() => {
		nowGroupRef.current?.remove();
		nowGroupRef.current = null;

		const palette = paletteRef.current;
		const parent = allElementsRef.current;
		if (!now || !palette || !parent) return;

		const fx = timeToFractionalX(now.time);
		if (fx === null) return;

		const temperature = Math.max(13, Math.min(30, now.temperature));
		const y = temperatureToY(temperature);
		const accent = palette.now;

		const lineColor = accent.clone();
		lineColor.alpha = 0.6;
		const verticalLine = new paper.Path({
			segments: [
				[fx, 22],
				[fx, 278],
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
			point: [fx, Math.max(24, y - 12)],
			content: `now ${Math.round(temperature * 10) / 10}°`,
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
	}, [paper, theme, now?.time, now?.temperature]);

	return null;
};
