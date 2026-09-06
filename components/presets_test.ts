import { assert, assertEquals, assertNotEquals } from "@std/assert";
import {
	heatingLevelToTemperature,
	temperatureToHeatingLevel,
} from "../server/temperature.ts";
import {
	GRAPH_MAX_TEMPERATURE,
	GRAPH_MIN_TEMPERATURE,
	MAX_POINTS,
	MIN_POINTS,
	type Schedule,
} from "./Graph.tsx";
import { minutesAfter, nightOf } from "./night.ts";
import {
	changeNight,
	DEFAULT_SCHEDULE,
	loadPreset,
	matchingPreset,
	PRESETS,
	temperatureRange,
} from "./presets.ts";

Deno.test("offers Cold, Cool and Neutral, coldest first", () => {
	assertEquals(
		PRESETS.map((preset) => preset.name),
		["Cold", "Cool", "Neutral"],
	);
});

Deno.test("keeps presets apart: each is warmer than the last at every time", () => {
	for (let i = 1; i < PRESETS.length; i++) {
		const colder = PRESETS[i - 1];
		const warmer = PRESETS[i];
		warmer.schedule.forEach(([time, temperature], index) => {
			assert(
				temperature > colder.schedule[index][1],
				`${warmer.name} is not warmer than ${colder.name} at ${time}`,
			);
		});
	}
});

Deno.test("keeps every point inside the graph's range on a half-degree step", () => {
	for (const { name, schedule } of PRESETS) {
		for (const [time, temperature] of schedule) {
			assert(
				temperature >= GRAPH_MIN_TEMPERATURE &&
					temperature <= GRAPH_MAX_TEMPERATURE,
				`${name} at ${time}: ${temperature} is outside the graph`,
			);
			assertEquals(
				temperature * 2,
				Math.round(temperature * 2),
				`${name} at ${time}: ${temperature} is not on a 0.5 °C step`,
			);
		}
	}
});

Deno.test("orders each preset's points across the night within the graph's limits", () => {
	for (const { name, schedule } of PRESETS) {
		assert(
			schedule.length >= MIN_POINTS && schedule.length <= MAX_POINTS,
			`${name} has ${schedule.length} points`,
		);
		const bedtime = schedule[0][0];
		for (let i = 1; i < schedule.length; i++) {
			assert(
				minutesAfter(bedtime, schedule[i][0]) >
					minutesAfter(bedtime, schedule[i - 1][0]),
				`${name}: ${schedule[i][0]} does not follow ${schedule[i - 1][0]}`,
			);
		}
	}
});

Deno.test("puts every preset on the same times so switching between them animates", () => {
	const times = PRESETS[0].schedule.map(([time]) => time);
	for (const { schedule } of PRESETS) {
		assertEquals(
			schedule.map(([time]) => time),
			times,
		);
	}
});

Deno.test("never schedules 27 °C, which the control loop reads as the pod being off", () => {
	// server/control_loop.ts leaves a pod whose target level is 0 alone, and
	// level 0 is how 27 °C is encoded.
	for (const { name, schedule } of PRESETS) {
		for (const [time, temperature] of schedule) {
			assertNotEquals(
				temperatureToHeatingLevel(temperature),
				0,
				`${name} at ${time} maps to heating level 0`,
			);
		}
	}
});

Deno.test("shows the Cold preset for a side that has never been drawn", () => {
	assertEquals(PRESETS[0].name, "Cold");
	assertEquals(DEFAULT_SCHEDULE, PRESETS[0].schedule);
});

Deno.test("recognises a preset after its temperatures went through the pod's levels", () => {
	for (const preset of PRESETS) {
		// What the app shows after a save and reload.
		const reloaded: Schedule = preset.schedule.map(([time, temperature]) => [
			time,
			heatingLevelToTemperature(temperatureToHeatingLevel(temperature)),
		]);
		assertEquals(matchingPreset(reloaded)?.id, preset.id);
	}
});

Deno.test("stops matching once a handle has been dragged", () => {
	const [first, ...rest] = PRESETS[0].schedule;
	const dragged: Schedule = [[first[0], first[1] + 0.5], ...rest];
	assertEquals(matchingPreset(dragged), null);
});

Deno.test("stops matching once a point has been added", () => {
	const [first, second, ...rest] = PRESETS[0].schedule;
	const added: Schedule = [
		first,
		["23:00", (first[1] + second[1]) / 2],
		second,
		...rest,
	];
	assertEquals(matchingPreset(added), null);
});

Deno.test("reports the coldest and warmest point of a schedule", () => {
	assertEquals(
		temperatureRange([
			["22:00", 18],
			["00:00", 15.5],
			["08:00", 19],
		]),
		{ min: 15.5, max: 19 },
	);
});

Deno.test("matches by heating level, not by degrees", () => {
	// A reloaded point can differ from the preset by a fraction of a degree
	// while still being the same level the pod is set to.
	const [[time, temperature], ...rest] = PRESETS[0].schedule;
	const nudged = temperature + 0.05;
	assertEquals(
		temperatureToHeatingLevel(nudged),
		temperatureToHeatingLevel(temperature),
		"precondition: the nudge must not change the level",
	);
	const reloaded: Schedule = [[time, nudged], ...rest];
	assertEquals(matchingPreset(reloaded)?.id, PRESETS[0].id);
});

Deno.test("loads a preset into the night the side already has", () => {
	const custom: Schedule = [
		["23:00", 18],
		["03:00", 16],
		["07:00", 19],
	];
	const loaded = loadPreset(PRESETS[1], custom);
	assertEquals(
		loaded.map(([time]) => time),
		["23:00", "00:35", "02:10", "03:50", "05:25", "07:00"],
	);
	assertEquals(
		loaded.map(([, temperature]) => temperature),
		PRESETS[1].schedule.map(([, temperature]) => temperature),
	);
	assertEquals(matchingPreset(loaded)?.id, PRESETS[1].id);
});

Deno.test("loads a preset as drawn when the side has nothing to fit it to", () => {
	assertEquals(loadPreset(PRESETS[0], []), PRESETS[0].schedule);
});

Deno.test("keeps recognising a preset however often its night changes", () => {
	const loaded = loadPreset(PRESETS[0], DEFAULT_SCHEDULE);
	const later = changeNight(loaded, "23:00", "08:00");
	const shorter = changeNight(later, "23:00", "07:00");
	assertEquals(matchingPreset(shorter)?.id, PRESETS[0].id);
	assertEquals(nightOf(shorter), {
		start: "23:00",
		end: "07:00",
		minutes: 480,
	});
});

Deno.test("stretches a hand-drawn curve when its night changes", () => {
	const custom: Schedule = [
		["22:00", 18],
		["23:00", 17],
		["08:00", 19],
	];
	assertEquals(changeNight(custom, "22:00", "06:00"), [
		["22:00", 18],
		["22:50", 17],
		["06:00", 19],
	]);
	assertEquals(matchingPreset(custom), null);
});
