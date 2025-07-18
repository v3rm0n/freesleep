import { useEffect, useRef } from "hono/jsx/dom";
import { usePaper } from "./paper.tsx";

export type Time = string;
export type Temperature = number;

interface GraphProps {
	data: [Time, Temperature][];
	onChange?: (data: [Time, Temperature][]) => void;
}

export const Graph = ({ data, onChange }: GraphProps) => {
	const { paper } = usePaper();
	const graphRef = useRef<paper.Path | null>(null);
	const xAxisRef = useRef<paper.Path | null>(null);
	const referenceLinesRef = useRef<paper.Group | null>(null);
	const allElementsRef = useRef<paper.Group | null>(null);
	const curveSegmentsRef = useRef<paper.Segment[]>([]);
	const scaleRef = useRef<{ x: number; y: number }>({ x: 1, y: 1 });
	const dragStateRef = useRef<{
		isDragging: boolean;
		changedPoints: Map<string, number>;
	}>({
		isDragging: false,
		changedPoints: new Map(),
	});

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

	// Shared refreshGraph function that can be used by both useEffects
	const refreshGraph = () => {
		if (!graphRef.current || !xAxisRef.current || !referenceLinesRef.current)
			return;

		const graph = graphRef.current;
		const xAxis = xAxisRef.current;
		const referenceLines = referenceLinesRef.current;
		const curveSegments = curveSegmentsRef.current;

		if (!curveSegments) return;

		// Smoothen
		for (let i = 0; i < graph.segments.length; i++) {
			if (i > 0 && i < curveSegments.length - 1) {
				graph.segments[i].smooth({ type: "catmull-rom" });
			} else {
				graph.segments[i].smooth = false;
			}
		}

		if (curveSegments.length === 0) {
			return;
		}

		// Create gradient
		const gradientStops: paper.GradientStop[] = [];
		const xStart = curveSegments[0].point.x;
		const xEnd = curveSegments[curveSegments.length - 1].point.x;
		const xRange = xEnd - xStart;

		const hot = new paper.Color(1.0, 1.0, 0.0);
		const cold = new paper.Color(0.0, 0.4, 1.0);
		const neutral = new paper.Color(0.9, 0.1, 0.0);

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

			gradientStops.push(
				new paper.GradientStop(
					new paper.Color(r, g, b),
					(point.x - xStart) / xRange,
				),
			);
		});

		const gradient = new paper.Gradient();
		gradient.stops = gradientStops;
		graph.fillColor = new paper.Color(gradient, [xStart, 0], [xEnd, 0]);

		xAxis.bringToFront();
		referenceLines.sendToBack();

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

	useEffect(() => {
		console.log("[Graph] First useEffect: Creating graph with data:", data);

		// Clean up existing objects
		if (allElementsRef.current) {
			allElementsRef.current.remove();
		}

		scaleRef.current = { x: 1, y: 1 };

		// Get x positions based on data length
		const xPositions = getXPositions(data.length);

		// Create graph segments with actual data positions
		const graphSegments: [number, number][] = [];
		data.forEach(([time, temperature], i) => {
			const x = xPositions[i];
			const y = temperatureToY(temperature);
			graphSegments.push([x, y]);
			console.log(
				`[Graph] Initial point ${i}: ${time} -> ${temperature}°C at (${x}, ${y})`,
			);
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
		console.log(
			"[Graph] Graph created with segments:",
			curveSegmentsRef.current.length,
		);

		// Create x-axis
		const xAxis = new paper.Path({
			segments: [
				[xPositions[0], 275],
				[xPositions[xPositions.length - 1], 275],
			],
			strokeColor: "grey",
		});
		xAxisRef.current = xAxis;

		// Helper function to create reference lines
		const createReferenceLine = (x: number, time: string) => {
			const referenceLine = new paper.Path({
				segments: [
					[x, 20],
					[x, 278],
				],
				strokeColor: "grey",
				strokeJoin: "round",
				strokeCap: "round",
				dashArray: [10, 6],
			});

			const referenceText = new paper.PointText({
				point: [x, 10],
				content: x.toString(),
				fillColor: "grey",
				fontSize: 10,
				justification: "center",
			});

			const referenceTime = new paper.PointText({
				point: [x, 290],
				content: time,
				fillColor: "grey",
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
			fillColor: "grey",
		});

		const midTemp = new paper.PointText({
			point: [20, (275 + 30) / 2],
			content: "22",
			justification: "right",
			fillColor: "grey",
		});

		const minTemp = new paper.PointText({
			point: [20, 275],
			content: "13",
			justification: "right",
			fillColor: "grey",
		});

		const temperatures = new paper.Group([maxTemp, midTemp, minTemp]);

		// Group all elements
		const allElements = new paper.Group([
			graph,
			xAxis,
			temperatures,
			referenceLines,
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

		// Set up event handlers
		const onMouseDown = (_event: paper.MouseEvent) => {
			dragStateRef.current.isDragging = true;
		};

		const onMouseDrag = (event: paper.MouseEvent) => {
			const segment = closestCurveSegment(event.point);

			if (!scaleRef.current) return;

			// Convert to temperature first to apply proper bounds
			const rawY = Math.max(
				Math.min(event.point.y, 275 * scaleRef.current.y),
				25 * scaleRef.current.y,
			);
			const rawTemperature = yToTemperatureScaled(rawY);

			// Clamp temperature to valid range (13°C to 30°C)
			const clampedTemperature = Math.max(13, Math.min(30, rawTemperature));

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
				dragStateRef.current.changedPoints.set(
					time,
					Math.round(clampedTemperature * 10) / 10,
				);
			}
		};

		const onMouseUp = (_event: paper.MouseEvent) => {
			if (!dragStateRef.current) return;

			// Call onChange with all data when mouse is released
			if (dragStateRef.current.isDragging && onChange) {
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

				// Call onChange once with complete updated dataset
				onChange(updatedData);
			}

			// Reset drag state
			dragStateRef.current.isDragging = false;
			dragStateRef.current.changedPoints.clear();
		};

		const onResize = (event: { size: paper.Size }) => {
			rescale(event.size);
		};

		paper.view.onMouseDown = onMouseDown;
		paper.view.onMouseDrag = onMouseDrag;
		paper.view.onMouseUp = onMouseUp;
		paper.view.onResize = onResize;

		// Initial setup
		rescale(paper.view.size);
		refreshGraph();

		// Cleanup function
		return () => {
			paper.view.onMouseDown = null;
			paper.view.onMouseDrag = null;
			paper.view.onMouseUp = null;
			paper.view.onResize = null;
			if (allElementsRef.current) {
				allElementsRef.current.remove();
			}
		};
	}, [paper]);

	// Update graph when data changes
	useEffect(() => {
		console.log("[Graph] Data update effect triggered with data:", data);

		// If no data, don't proceed
		if (!data || data.length === 0) {
			console.log("[Graph] Data update effect: No data");
			return;
		}

		// If graph hasn't been created yet, don't proceed (first useEffect will handle creation)
		if (!graphRef.current) {
			console.log("[Graph] Data update effect: Graph not created yet");
			return;
		}

		const graph = graphRef.current;
		const curveSegments = curveSegmentsRef.current;

		if (data.length !== curveSegments.length) {
			console.error(
				`Invalid data array length ${data.length} != ${curveSegments.length}`,
			);
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

	return null;
};
