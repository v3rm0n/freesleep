import { assertEquals } from "jsr:@std/assert";
import { DeviceResponse, Temperature, UserResponse } from "./model/index.ts";

Deno.test("User schema matches the json fixture", async () => {
	const userJson = await Deno.readTextFile("./fixtures/user.json");
	const parsed = UserResponse.parse(JSON.parse(userJson));
	assertEquals(parsed.user.userId, "045409770b124a7f89ce006e0c000000");
});

Deno.test("Device schema matches the json fixture", async () => {
	const deviceJson = await Deno.readTextFile("./fixtures/device.json");
	const parsed = DeviceResponse.parse(JSON.parse(deviceJson));
	assertEquals(parsed.result.deviceId, "510043000750314d35323620");
});

Deno.test("Temperature schema matches the json fixture", async () => {
	const temperatureJson = await Deno.readTextFile(
		"./fixtures/temperature.json",
	);
	const parsed = Temperature.parse(JSON.parse(temperatureJson));
	assertEquals(parsed.scheduleType, "timeBased");
});
