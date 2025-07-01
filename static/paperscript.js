// This is a Paperscript file, not JavaScript
// Assuming aspect ratio 4/3
project.currentStyle = {
	fontFamily: "SF Pro Display",
	fontSize: 12,
	fillColor: "white"
};
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

var strokeWidth = 4;
var xScale = view.size.width / 400;
var yScale = view.size.height / 300;

var axes = new Path();
axes.strokeColor = "grey";
axes.fillColor = undefined;
axes.strokeWidth = strokeWidth;
axes.strokeJoin = "round";
axes.strokeCap = "round";
axes.add(new Point(25, 25));
axes.add(new Point(25, 275));
axes.add(new Point(375, 275));

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

var currentTemp = new PointText({
	point: [20, 30],
	content: "30",
	justification: "center"
});
currentTemp.visible = false;

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
	currentTemp
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

view.onMouseDrag = function (event) {
	var segment = closestSegment(graph, event.point);
	var newY = Math.max(Math.min(event.point.y, 275 * yScale), 25 * yScale);
	segment.point.y = newY;
	graph.smooth({ type: "catmull-rom" });
	currentTemp.point.y = newY - 25;
	currentTemp.point.x = segment.point.x;

	var fillSegment = fillPath.segments[graph.segments.indexOf(segment)];
	if (fillSegment) {
		fillSegment.point.y = newY;
	}
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
};

view.onMouseDown = function (event) {
	currentTemp.point.y = event.point.y - 25;
	currentTemp.point.x = event.point.x;
	currentTemp.visible = true;
};

view.onMouseUp = function (_event) {
	currentTemp.visible = false;
};

axes.bringToFront();
