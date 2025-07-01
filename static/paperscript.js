// This is a Paperscript file, not JavaScript
// Assuming aspect ratio 4/3
project.currentStyle = {
	fontFamily: "SF Pro Display",
	fontSize: 12,
	fillColor: "white"
};

var strokeWidth = 2;
var xScale = view.size.width / 400;
var yScale = view.size.height / 300;

var graph = new Path();
graph.strokeColor = "black";
graph.fillColor = undefined;
var points = [
	new Point(25, 25),
	new Point(95, 30),
	new Point(165, 100),
	new Point(235, 200),
	new Point(305, 200),
	new Point(375, 50)
];

points.forEach(function (point) {
	graph.add(point);
});

graph.smooth({ type: "catmull-rom" });

var fillPath = new Path();
// Add all the curve points
points.forEach(function (point) {
	fillPath.add(point);
});

fillPath.add(new Point(375, 275));
fillPath.add(new Point(25, 275));
fillPath.closed = true;
fillPath.fillColor = "black";

var axes = new Path();
axes.strokeColor = "grey";
axes.fillColor = undefined;
axes.strokeWidth = strokeWidth;
axes.add(new Point(25, 275));
axes.add(new Point(375, 275));

function createReferenceLine(x, time) {
	var referenceLine = new Path();
	referenceLine.strokeColor = "grey";
	referenceLine.fillColor = undefined;
	referenceLine.strokeWidth = strokeWidth;
	referenceLine.strokeJoin = "round";
	referenceLine.strokeCap = "round";
	referenceLine.dashArray = [10, 6];
	referenceLine.add(new Point(x, 20));
	referenceLine.add(new Point(x, 278));

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

var referenceLine0 = createReferenceLine(25, "22:00");
var referenceLine1 = createReferenceLine(95, "00:00");
var referenceLine2 = createReferenceLine(165, "02:00");
var referenceLine3 = createReferenceLine(235, "04:00");
var referenceLine4 = createReferenceLine(305, "06:00");
var referenceLine5 = createReferenceLine(375, "08:00");

var referenceLines = new Group([
	referenceLine0,
	referenceLine1,
	referenceLine2,
	referenceLine3,
	referenceLine4,
	referenceLine5
]);

var maxTemp = new PointText({
	point: [20, 30],
	content: "30",
	justification: "right"
});
var midTemp = new PointText({
	point: [20, (275 + 30) / 2],
	content: "22",
	justification: "right"
});
var minTemp = new PointText({
	point: [20, 275],
	content: "13",
	justification: "right"
});

function smoothFillPath() {
	var i;
	var curveSegmentCount = graph.segments.length;
	for (i = 0; i < fillPath.segments.length; i++) {
		if (i > 0 && i < curveSegmentCount - 1) {
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

	var orange = new Color(1.0, 0.35, 0.0);
	var blue = new Color(0.0, 0.0, 1.0);

	curveSegments.forEach(function (segment) {
		var point = segment.point;
		var t = point.y / (200 * yScale);
		t = Math.max(0, Math.min(1, t));

		var r = orange.red + (blue.red - orange.red) * t;
		var g = orange.green + (blue.green - orange.green) * t;
		var b = orange.blue + (blue.blue - orange.blue) * t;

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
	var minDistance;
	var closestSegment = path.segments[0];
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

	var fillSegment = fillPath.segments[index];
	if (fillSegment) {
		fillSegment.point.y = newY;
	}
	referenceLines.children[index].lastChild.content = yToTemperature(newY);
	smoothFillPath();
	createHorizontalGradient();
	axes.bringToFront();
};
view.onResize = function (event) {
	// Calculate new absolute scale factors
	var newXScale = event.size.width / 400;
	var newYScale = event.size.height / 300;

	// Calculate the relative scale from current to new
	var relativeXScale = newXScale / xScale;
	var relativeYScale = newYScale / yScale;

	// Apply the relative scaling
	allElements.scale(relativeXScale, relativeYScale, new Point(0, 0));

	// Update the current scale factors
	xScale = newXScale;
	yScale = newYScale;

	graph.segments.forEach(function (segment) {
		referenceLines.children[graph.segments.indexOf(segment)].lastChild.content =
			yToTemperature(segment.point.y);
	});

	referenceLines.sendToBack();
};

axes.bringToFront();
