import { useEffect, useRef } from "hono/jsx/dom";
import { usePaper } from "./paper.tsx";

export type Time = string;
export type Temperature = number;

interface GraphProps {
	data: [Time, Temperature][];
	onChange?: (time: Time, temperature: Temperature) => void;
}

export const Graph = ({ data, onChange }: GraphProps) => {
	const { paper } = usePaper();
	const graphRef = useRef<paper.Path | null>(null);
	const xAxisRef = useRef<paper.Path | null>(null);
	const referenceLinesRef = useRef<paper.Group | null>(null);
	const temperaturesRef = useRef<paper.Group | null>(null);
	const allElementsRef = useRef<paper.Group | null>(null);
	const curveSegmentsRef = useRef<paper.Segment[]>([]);
	const scaleRef = useRef({ x: 1, y: 1 });

	// Helper functions for coordinate conversion
	const getXPositions = (dataLength: number): number[] => {
		if (dataLength <= 1) return [200]; // Center position for single point
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

	useEffect(() => {
		// Clean up existing objects
		if (allElementsRef.current) {
			allElementsRef.current.remove();
		}

		// Get x positions based on data length
		const xPositions =
			data && data.length > 0
				? getXPositions(data.length)
				: [25, 95, 165, 235, 305, 375];

		// Create graph segments
		const graphSegments: [number, number][] = [];
		xPositions.forEach((x) => graphSegments.push([x, 275]));
		graphSegments.push([xPositions[xPositions.length - 1], 275]); // Last point
		graphSegments.push([xPositions[0], 275]); // Back to first point

		// Create graph
		const graph = new paper.Path({
			segments: graphSegments,
			closed: true,
		});
		graphRef.current = graph;
		curveSegmentsRef.current = graph.segments.slice(0, xPositions.length);

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
			const time = data?.[index] ? data[index][0] : `${index * 2}:00`;
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
		temperaturesRef.current = temperatures;

		// Group all elements
		const allElements = new paper.Group([
			graph,
			xAxis,
			temperatures,
			referenceLines,
		]);
		allElementsRef.current = allElements;

		// Helper functions
		const smoothen = () => {
			const curveSegments = curveSegmentsRef.current;
			for (let i = 0; i < graph.segments.length; i++) {
				if (i > 0 && i < curveSegments.length - 1) {
					// Smooth only the middle curve segments
					graph.segments[i].smooth({ type: "catmull-rom" });
				} else {
					// Keep first curve point, last curve point, and bottom segments sharp
					graph.segments[i].smooth = false;
				}
			}
		};

		const createGradient = () => {
			const curveSegments = curveSegmentsRef.current;
			const gradientStops: paper.GradientStop[] = [];
			const xStart = curveSegments[0].point.x;
			const xEnd = curveSegments[curveSegments.length - 1].point.x;
			const xRange = xEnd - xStart;

			// Define base colors
			const hot = new paper.Color(1.0, 1.0, 0.0);
			const cold = new paper.Color(0.0, 0.4, 1.0);
			const neutral = new paper.Color(0.9, 0.1, 0.0);

			curveSegments.forEach((segment) => {
				const point = segment.point;
				let t = point.y / (170 * scaleRef.current.y);
				t = Math.max(0, Math.min(1, t));

				let r: number, g: number, b: number, f: number;

				// First half: hot → neutral
				if (t < 0.5) {
					f = t / 0.5;
					r = hot.red + (neutral.red - hot.red) * f;
					g = hot.green + (neutral.green - hot.green) * f;
					b = hot.blue + (neutral.blue - hot.blue) * f;
				}
				// Second half: neutral → cold
				else {
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
		};

		const yToTemperatureScaled = (y: number) => {
			return yToTemperature(y / scaleRef.current.y);
		};

		const refreshGraph = () => {
			smoothen();
			createGradient();
			xAxis.bringToFront();
			referenceLines.sendToBack();
			curveSegmentsRef.current.forEach((segment) => {
				const index = curveSegmentsRef.current.indexOf(segment);
				const referenceGroup = referenceLines.children[index] as paper.Group;
				if (referenceGroup?.lastChild) {
					(referenceGroup.lastChild as paper.PointText).content =
						`${Math.round(yToTemperatureScaled(segment.point.y) * 10) / 10}°`;
				}
			});
		};

		const rescale = (size: paper.Size) => {
			// Calculate new absolute scale factors
			const newXScale = size.width / 400;
			const newYScale = size.height / 300;
			// Apply the relative scaling
			allElements.scale(
				newXScale / scaleRef.current.x,
				newYScale / scaleRef.current.y,
				[0, 0],
			);
			// Update the current scale factors
			scaleRef.current.x = newXScale;
			scaleRef.current.y = newYScale;
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
		const onMouseDrag = (event: paper.MouseEvent) => {
			const segment = closestCurveSegment(event.point);
			const newY = Math.max(
				Math.min(event.point.y, 275 * scaleRef.current.y),
				25 * scaleRef.current.y,
			);
			segment.point.y = newY;
			curveSegmentsRef.current[
				curveSegmentsRef.current.indexOf(segment)
			].point.y = newY;
			refreshGraph();

			// Call onChange callback if provided
			if (onChange) {
				const time = xToTime(segment.point.x / scaleRef.current.x);
				const temperature = yToTemperatureScaled(newY);
				onChange(time, Math.round(temperature * 10) / 10); // Round to 1 decimal
			}
		};

		const onResize = (event: { size: paper.Size }) => {
			rescale(event.size);
		};

		paper.view.onMouseDrag = onMouseDrag;
		paper.view.onResize = onResize;

		// Initial setup
		rescale(paper.view.size);
		refreshGraph();

		// Cleanup function
		return () => {
			paper.view.onMouseDrag = null;
			paper.view.onResize = null;
			if (allElementsRef.current) {
				allElementsRef.current.remove();
			}
		};
	}, [paper, data]);

	// Update graph when data changes
	useEffect(() => {
		if (!graphRef.current || !data || data.length === 0) {
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

		const refreshGraph = () => {
			if (!graphRef.current || !xAxisRef.current || !referenceLinesRef.current)
				return;

			const graph = graphRef.current;
			const xAxis = xAxisRef.current;
			const referenceLines = referenceLinesRef.current;
			const curveSegments = curveSegmentsRef.current;

			// Smoothen
			for (let i = 0; i < graph.segments.length; i++) {
				if (i > 0 && i < curveSegments.length - 1) {
					graph.segments[i].smooth({ type: "catmull-rom" });
				} else {
					graph.segments[i].smooth = false;
				}
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

			const yToTemperatureScaled = (y: number) => {
				return yToTemperature(y / scaleRef.current.y);
			};

			curveSegments.forEach((segment) => {
				const index = curveSegments.indexOf(segment);
				const referenceGroup = referenceLines.children[index] as paper.Group;
				if (referenceGroup?.lastChild) {
					(referenceGroup.lastChild as paper.PointText).content =
						`${Math.round(yToTemperatureScaled(segment.point.y) * 10) / 10}°`;
				}
			});
		};

		tween.onUpdate = () => {
			refreshGraph();
		};

		tween.start();
	}, [data]);

	return null;
};
