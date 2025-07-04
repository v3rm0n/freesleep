// This is a Paperscript file, not JavaScript
// Assuming aspect ratio 4/3
project.currentStyle = {
	fontFamily: "SF Pro Display",
	fontSize: 12,
	strokeWidth: 2
};

var xScale = 1;
var yScale = 1;

var graph = new Path({
	segments: [
		[25, 275],
		[95, 275],
		[165, 275],
		[235, 275],
		[305, 275],
		[375, 275],
		[375, 275],
		[25, 275]
	],
	closed: true
});

var curveSegments = graph.segments.slice(0, 6);

function smoothen() {
	var i;
	for (i = 0; i < graph.segments.length; i++) {
		if (i > 0 && i < curveSegments.length - 1) {
			// Smooth only the middle curve segments
			graph.segments[i].smooth({ type: "catmull-rom" });
		} else {
			// Keep first curve point, last curve point, and bottom segments sharp
			graph.segments[i].smooth = false;
		}
	}
}

function createGradient() {
	var gradientStops = [];
	var xStart = curveSegments[0].point.x;
	var xEnd = curveSegments[curveSegments.length - 1].point.x;
	var xRange = xEnd - xStart;

	// Define base colors
	var hot = new Color(1.0, 1.0, 0.0);
	var cold = new Color(0.0, 0.4, 1.0);
	var neutral = new Color(0.9, 0.1, 0.0);

	curveSegments.forEach(function (segment) {
		var point = segment.point;
		var t = point.y / (170 * yScale);
		t = Math.max(0, Math.min(1, t));

		var r, g, b, f;

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
			new GradientStop(new Color(r, g, b), (point.x - xStart) / xRange)
		);
	});

	graph.fillColor = new Color(
		new Gradient(gradientStops),
		new Point(xStart, 0),
		new Point(xEnd, 0)
	);
}

function setCurve(points) {
	if (points.length !== curveSegments.length) {
		console.error("Invalid points array length");
		return;
	}
	var tweenTo = {};
	points.forEach(function (point, i) {
		tweenTo["segments[" + i + "].point.x"] = point[0] * xScale;
		tweenTo["segments[" + i + "].point.y"] = point[1] * yScale;
	});

	var elasticEaseOut = function (t) {
		var c4 = (2 * Math.PI) / 3;
		return t === 0
			? 0
			: t === 1
				? 1
				: Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
	};

	var tween = graph.tween(tweenTo, {
		duration: 1000,
		easing: elasticEaseOut,
		start: false
	});
	tween.onUpdate = function () {
		refreshGraph();
	};
	tween.start();
}

var xAxis = new Path({
	segments: [
		[25, 275],
		[375, 275]
	],
	strokeColor: "grey"
});

function createReferenceLine(x, time) {
	var referenceLine = new Path({
		segments: [
			[x, 20],
			[x, 278]
		],
		strokeColor: "grey",
		strokeJoin: "round",
		strokeCap: "round",
		dashArray: [10, 6]
	});

	var referenceText = new PointText({
		point: [x, 10],
		content: x,
		fillColor: "grey",
		fontSize: 10,
		justification: "center"
	});

	var referenceTime = new PointText({
		point: [x, 290],
		content: time,
		fillColor: "grey",
		fontSize: 10,
		justification: "center"
	});

	return new Group([referenceLine, referenceTime, referenceText]);
}

var referenceLines = new Group([
	createReferenceLine(25, "22:00"),
	createReferenceLine(95, "00:00"),
	createReferenceLine(165, "02:00"),
	createReferenceLine(235, "04:00"),
	createReferenceLine(305, "06:00"),
	createReferenceLine(375, "08:00")
]);

function yToTemperature(y) {
	return Math.abs(Math.round(((y / yScale) * 17) / 250) - 2 - 30);
}

function refreshGraph() {
	smoothen();
	createGradient();
	xAxis.bringToFront();
	referenceLines.sendToBack();
	curveSegments.forEach(function (segment) {
		referenceLines.children[curveSegments.indexOf(segment)].lastChild.content =
			yToTemperature(segment.point.y);
	});
}

var maxTemp = new PointText({
	point: [20, 30],
	content: "30",
	justification: "right",
	fillColor: "grey"
});

var midTemp = new PointText({
	point: [20, (275 + 30) / 2],
	content: "22",
	justification: "right",
	fillColor: "grey"
});

var minTemp = new PointText({
	point: [20, 275],
	content: "13",
	justification: "right",
	fillColor: "grey"
});

var temperatures = new Group([maxTemp, midTemp, minTemp]);

var allElements = new Group([graph, xAxis, temperatures, referenceLines]);

function rescale(size) {
	// Calculate new absolute scale factors
	var newXScale = size.width / 400;
	var newYScale = size.height / 300;
	// Apply the relative scaling
	allElements.scale(newXScale / xScale, newYScale / yScale, new Point(0, 0));
	// Update the current scale factors
	xScale = newXScale;
	yScale = newYScale;
}

rescale(view.size);

refreshGraph();

function closestCurveSegment(point) {
	var closestSegment = curveSegments[0];
	var minDistance;
	curveSegments.forEach(function (segment) {
		var distance = Math.abs(segment.point.x - point.x);
		if (distance < minDistance || minDistance === undefined) {
			minDistance = distance;
			closestSegment = segment;
		}
	});
	return closestSegment;
}

view.onMouseDrag = function (event) {
	var segment = closestCurveSegment(event.point);
	var newY = Math.max(Math.min(event.point.y, 275 * yScale), 25 * yScale);
	segment.point.y = newY;
	curveSegments[curveSegments.indexOf(segment)].point.y = newY;
	refreshGraph();
};

view.onResize = function (event) {
	rescale(event.size);
};

setCurve([
	[25, 100],
	[95, 80],
	[165, 150],
	[235, 200],
	[305, 200],
	[375, 150]
]);

globalThis.setCurve = setCurve;
