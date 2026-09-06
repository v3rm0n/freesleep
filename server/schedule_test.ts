import { assertEquals } from "@std/assert";
import { activeHeatingState } from "./schedule.ts";

// A typical night, drawn on the evening of 2026-09-06 and crossing midnight.
const night = [
	{ time: "2026-09-06T22:00:00.000Z", level: -75 },
	{ time: "2026-09-07T00:00:00.000Z", level: -83 },
	{ time: "2026-09-07T02:00:00.000Z", level: -94 },
	{ time: "2026-09-07T04:00:00.000Z", level: -97 },
	{ time: "2026-09-07T06:00:00.000Z", level: -83 },
	{ time: "2026-09-07T08:00:00.000Z", level: -67 },
];

const levelAt = (iso: string) =>
	activeHeatingState(night, new Date(iso))?.level ?? null;

Deno.test("applies the most recent point on the night it was drawn", () => {
	assertEquals(levelAt("2026-09-06T22:00:00Z"), -75);
	assertEquals(levelAt("2026-09-06T23:59:00Z"), -75);
	assertEquals(levelAt("2026-09-07T03:00:00Z"), -94);
	assertEquals(levelAt("2026-09-07T08:00:00Z"), -67);
});

Deno.test("repeats every night", () => {
	assertEquals(levelAt("2026-09-20T22:30:00Z"), -75);
	assertEquals(levelAt("2026-09-21T05:00:00Z"), -97);
	assertEquals(levelAt("2027-01-01T07:59:00Z"), -83);
});

Deno.test("is inactive outside the drawn window", () => {
	assertEquals(levelAt("2026-09-06T12:00:00Z"), null);
	assertEquals(levelAt("2026-09-07T08:01:00Z"), null);
	assertEquals(levelAt("2026-09-07T12:00:00Z"), null);
	assertEquals(levelAt("2026-09-07T21:59:00Z"), null);
});

Deno.test("ignores the order the points were sent in", () => {
	const shuffled = [night[3], night[0], night[5], night[1], night[4], night[2]];
	assertEquals(
		activeHeatingState(shuffled, new Date("2026-09-30T01:00:00Z"))?.level,
		-83,
	);
});

Deno.test("handles a curve saved after midnight", () => {
	// Drawn at 01:00 on 2026-09-07: the UI anchors "22:00" to that evening and
	// the morning points to the following day, so every point is in the future.
	const lateEdit = [
		{ time: "2026-09-07T22:00:00.000Z", level: -75 },
		{ time: "2026-09-08T00:00:00.000Z", level: -83 },
		{ time: "2026-09-08T04:00:00.000Z", level: -97 },
	];
	assertEquals(
		activeHeatingState(lateEdit, new Date("2026-09-07T01:00:00Z"))?.level,
		-83,
	);
	assertEquals(
		activeHeatingState(lateEdit, new Date("2026-09-07T05:00:00Z")),
		null,
	);
});

Deno.test("returns null for an empty schedule", () => {
	assertEquals(activeHeatingState([], new Date()), null);
});
