import { assertAlmostEquals, assertEquals } from "@std/assert";
import {
	heatingLevelToTemperature,
	temperatureToHeatingLevel,
} from "./temperature.ts";

Deno.test("maps table entries exactly", () => {
	assertEquals(heatingLevelToTemperature(-100), 13);
	assertEquals(heatingLevelToTemperature(0), 27);
	assertEquals(heatingLevelToTemperature(100), 44);
	assertEquals(temperatureToHeatingLevel(13), -100);
	assertEquals(temperatureToHeatingLevel(27), 0);
	assertEquals(temperatureToHeatingLevel(44), 100);
});

Deno.test("interpolates between table entries", () => {
	assertEquals(heatingLevelToTemperature(-71), 18.5);
	assertEquals(heatingLevelToTemperature(3), 27.5);
	assertEquals(temperatureToHeatingLevel(18.5), -71);
	assertEquals(temperatureToHeatingLevel(27.5), 3);
});

Deno.test("round-trips the graph's 0.5 °C steps within a level's resolution", () => {
	// Levels are integers and the table has as few as 3 levels per degree, so a
	// round trip can be off by up to half a level (≈0.17 °C).
	for (let temperature = 13; temperature <= 30; temperature += 0.5) {
		const level = temperatureToHeatingLevel(temperature);
		assertAlmostEquals(heatingLevelToTemperature(level), temperature, 0.2);
	}
});

Deno.test("clamps values outside the supported range", () => {
	assertEquals(heatingLevelToTemperature(-120), 13);
	assertEquals(heatingLevelToTemperature(140), 44);
	assertEquals(temperatureToHeatingLevel(5), -100);
	assertEquals(temperatureToHeatingLevel(50), 100);
});
