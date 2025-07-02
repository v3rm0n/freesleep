// This is a Paperscript file, not JavaScript
// Assuming aspect ratio 4/3
project.currentStyle = {
	fontFamily: "SF Pro Display",
	fontSize: 12,
	strokeWidth: 2
};

var xScale = view.size.width / 400;
var yScale = view.size.height / 300;

var points = [
	[25, 25],
	[95, 30],
	[165, 100],
	[235, 200],
	[305, 200],
	[375, 50]
];

var graph = new Path({ segments: points });
graph.smooth({ type: "catmull-rom" });

var fillPath = new Path({
	segments: points.concat([
		[375, 275],
		[25, 275]
	]),
	closed: true
});

var axes = new Path({
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

function smoothFillPath() {
	var i;
	for (i = 0; i < fillPath.segments.length; i++) {
		if (i > 0 && i < graph.segments.length - 1) {
			// Smooth only the middle curve segments
			fillPath.segments[i].smooth({ type: "catmull-rom" });
		} else {
			// Keep first curve point, last curve point, and bottom segments sharp
			fillPath.segments[i].smooth = false;
		}
	}
}

smoothFillPath();

var allElements = new Group([
	graph,
	axes,
	fillPath,
	maxTemp,
	midTemp,
	minTemp,
	referenceLines
]);

allElements.scale(xScale, yScale, new Point(0, 0));

function createHorizontalGradient() {
	var gradientStops = [];
	var curveSegments = fillPath.segments.slice(0, 6);
	var xStart = curveSegments[0].point.x;
	var xEnd = curveSegments[curveSegments.length - 1].point.x;
	var xRange = xEnd - xStart;

	// Define base colors
	var orange = new Color(1.0, 1.0, 0.0); // strong orange
	var blue = new Color(0.0, 0.4, 1.0); // strong blue
	var neutral = new Color(0.9, 0.1, 0.0); // warm gray/neutral

	curveSegments.forEach(function (segment) {
		var point = segment.point;
		var t = point.y / (170 * yScale);
		t = Math.max(0, Math.min(1, t));

		var r, g, b, f;

		// First half: orange → neutral
		if (t < 0.5) {
			f = t / 0.5;
			r = orange.red + (neutral.red - orange.red) * f;
			g = orange.green + (neutral.green - orange.green) * f;
			b = orange.blue + (neutral.blue - orange.blue) * f;
		}
		// Second half: neutral → blue
		else {
			f = (t - 0.5) / 0.5;
			r = neutral.red + (blue.red - neutral.red) * f;
			g = neutral.green + (blue.green - neutral.green) * f;
			b = neutral.blue + (blue.blue - neutral.blue) * f;
		}

		var color = new Color(r, g, b);
		var offset = (point.x - xStart) / xRange;
		gradientStops.push(new GradientStop(color, offset));
	});

	var gradient = new Gradient(gradientStops);
	fillPath.fillColor = new Color(
		gradient,
		new Point(xStart, 0),
		new Point(xEnd, 0)
	);
}

createHorizontalGradient();

function closestSegment(path, point) {
	var closestSegment = path.segments[0];
	var minDistance;
	path.segments.forEach(function (segment) {
		var distance = Math.abs(segment.point.x - point.x);
		if (distance < minDistance || minDistance === undefined) {
			minDistance = distance;
			closestSegment = segment;
		}
	});
	return closestSegment;
}

function yToTemperature(y) {
	return Math.abs(Math.round(((y / yScale) * 17) / 250) - 2 - 30);
}

view.onMouseDrag = function (event) {
	var segment = closestSegment(graph, event.point);
	var newY = Math.max(Math.min(event.point.y, 275 * yScale), 25 * yScale);
	segment.point.y = newY;
	graph.smooth({ type: "catmull-rom" });
	var index = graph.segments.indexOf(segment);
	fillPath.segments[index].point.y = newY;
	referenceLines.children[index].lastChild.content = yToTemperature(newY);
	smoothFillPath();
	createHorizontalGradient();
	axes.bringToFront();
};

view.onResize = function (event) {
	// Calculate new absolute scale factors
	var newXScale = event.size.width / 400;
	var newYScale = event.size.height / 300;

	// Apply the relative scaling
	allElements.scale(newXScale / xScale, newYScale / yScale, new Point(0, 0));

	// Update the current scale factors
	xScale = newXScale;
	yScale = newYScale;

	referenceLines.sendToBack();
};

view.onFrame = function (_event) {
	TWEEN.update();
};

axes.bringToFront();

graph.segments.forEach(function (segment) {
	referenceLines.children[graph.segments.indexOf(segment)].lastChild.content =
		yToTemperature(segment.point.y);
});

globalThis.setGraphPoints = function (points) {
	var i;
	for (i = 0; i < points.length; i++) {
		(function (segment, fillSegment, target) {
			new TWEEN.Tween({ x: segment.point.x, y: segment.point.y })
				.to({ x: target[0] * xScale, y: target[1] * yScale }, 500)
				.easing(TWEEN.Easing.Elastic.Out)
				.onUpdate(function (obj) {
					segment.point.set(obj.x, obj.y);
					fillSegment.point.set(obj.x, obj.y);
					graph.smooth({ type: "catmull-rom" });
					smoothFillPath();
					createHorizontalGradient();
				})
				.start();
		})(graph.segments[i], fillPath.segments[i], points[i]);
	}
};
