import { assert, assertEquals } from "@std/assert";
import type { Schedule } from "./Graph.tsx";
import {
	fitToNight,
	formatNightLength,
	formatTime,
	minutesAfter,
	minutesToTime,
	nightOf,
	toISODateTime,
} from "./night.ts";

// The Cold preset's shape: a ten-hour night with two hours between points.
const night: Schedule = [
	["22:00", 17.5],
	["00:00", 16.5],
	["02:00", 16],
	["04:00", 16],
	["06:00", 17.5],
	["08:00", 19],
];

Deno.test("counts the minutes after bedtime, wrapping past midnight", () => {
	assertEquals(minutesAfter("22:00", "22:00"), 0);
	assertEquals(minutesAfter("22:00", "23:30"), 90);
	assertEquals(minutesAfter("22:00", "00:00"), 120);
	assertEquals(minutesAfter("22:00", "08:00"), 600);
	assertEquals(minutesAfter("22:00", "21:59"), 1439);
	assertEquals(minutesAfter("09:00", "17:00"), 480);
});

Deno.test("describes the night a schedule spans", () => {
	assertEquals(nightOf(night), { start: "22:00", end: "08:00", minutes: 600 });
});

Deno.test("stretches the curve into a new night, keeping its shape", () => {
	assertEquals(fitToNight(night, "23:00", "07:00"), [
		["23:00", 17.5],
		["00:35", 16.5],
		["02:10", 16],
		["03:50", 16],
		["05:25", 17.5],
		["07:00", 19],
	]);
});

Deno.test("moves both ends of a two-point schedule", () => {
	assertEquals(
		fitToNight(
			[
				["22:00", 18],
				["08:00", 19],
			],
			"23:30",
			"06:00",
		),
		[
			["23:30", 18],
			["06:00", 19],
		],
	);
});

Deno.test("fits a curve to a night that spans noon", () => {
	assertEquals(
		fitToNight(night, "09:00", "17:00").map(([time]) => time),
		["09:00", "10:35", "12:10", "13:50", "15:25", "17:00"],
	);
});

Deno.test("leaves a schedule alone when its night does not change", () => {
	const odd: Schedule = [
		["22:00", 18],
		["01:43", 16],
		["08:00", 19],
	];
	assertEquals(fitToNight(odd, "22:00", "08:00"), odd);
});

Deno.test("keeps points in order when the night is too short for five-minute steps", () => {
	const crowded: Schedule = [
		["22:00", 18],
		...Array.from({ length: 10 }, (_, i): [string, number] => [
			minutesToTime(22 * 60 + 1 + i),
			17,
		]),
		["08:00", 19],
	];
	const fitted = fitToNight(crowded, "22:00", "23:00");
	assertEquals(fitted.length, crowded.length);
	assertEquals(fitted[0][0], "22:00");
	assertEquals(fitted[fitted.length - 1][0], "23:00");
	for (let i = 1; i < fitted.length; i++) {
		assert(
			minutesAfter("22:00", fitted[i][0]) >
				minutesAfter("22:00", fitted[i - 1][0]),
			`${fitted[i][0]} does not follow ${fitted[i - 1][0]}`,
		);
	}
});

Deno.test("formats the length of the night", () => {
	assertEquals(formatNightLength(600), "10 h");
	assertEquals(formatNightLength(570), "9 h 30 min");
	assertEquals(formatNightLength(45), "45 min");
});

Deno.test("formats minutes past midnight as a wall-clock time, wrapping the day", () => {
	assertEquals(minutesToTime(0), "00:00");
	assertEquals(minutesToTime(1475), "00:35");
	assertEquals(minutesToTime(-5), "23:55");
	assertEquals(minutesToTime(90.4), "01:30");
});

Deno.test("formats a date's local time", () => {
	assertEquals(formatTime(new Date(2026, 8, 6, 7, 5)), "07:05");
});

Deno.test("anchors a point to today, or to tomorrow once the night has passed midnight", () => {
	const today = new Date(2026, 8, 6, 15, 0);
	const local = (iso: string) => {
		const date = new Date(iso);
		return [date.getDate(), date.getHours(), date.getMinutes()];
	};
	assertEquals(local(toISODateTime("22:00", "22:00", today)), [6, 22, 0]);
	assertEquals(local(toISODateTime("00:30", "22:00", today)), [7, 0, 30]);
	// A day sleeper's night stays on one day even though it starts before noon.
	assertEquals(local(toISODateTime("09:00", "09:00", today)), [6, 9, 0]);
	assertEquals(local(toISODateTime("17:00", "09:00", today)), [6, 17, 0]);
});
