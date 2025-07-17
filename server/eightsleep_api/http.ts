import {
	AccessToken,
	CurrentDevice,
	type Device,
	DeviceResponse,
	type HeatingLevel,
	type Login,
	Temperature,
	type User,
	UserResponse,
} from "./model/index.ts";

const AUTH_API_URL = "https://auth-api.8slp.net/v1/tokens";
const APP_API_URL = "https://app-api.8slp.net/v1";
const CLIENT_API_URL = "https://client-api.8slp.net/v1";

export const login = async (login: Login): Promise<AccessToken> => {
	console.log(`Logging in as ${login.username}`);
	const response = await fetch(AUTH_API_URL, {
		method: "POST",
		body: JSON.stringify(login),
		headers: { "Content-Type": "application/json" },
	});
	console.log(`Status: ${response.status}`);
	const rawToken = await response.json();
	const accessToken = AccessToken.parse({
		...rawToken,
		expires_at: Date.now() + rawToken.expires_in * 1000,
	});
	console.log(`Logged in as ${login.username}, userId: ${accessToken.userId}`);
	return accessToken;
};

export const me = async (accessToken: AccessToken): Promise<User> => {
	const response = UserResponse.parse(
		await (
			await fetch(`${CLIENT_API_URL}/users/me`, {
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${accessToken.access_token}`,
				},
			})
		).json(),
	);
	return response.user;
};

export const device = async (
	deviceId: string,
	accessToken: AccessToken,
): Promise<Device> => {
	const response = DeviceResponse.parse(
		await (
			await fetch(`${CLIENT_API_URL}/devices/${deviceId}`, {
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${accessToken.access_token}`,
				},
			})
		).json(),
	);
	return response.result;
};

export const getTemperature = async (
	userId: string,
	accessToken: AccessToken,
): Promise<Temperature> => {
	console.log("Fetching temperature");
	const response = await fetch(`${APP_API_URL}/users/${userId}/temperature`, {
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${accessToken.access_token}`,
		},
	});
	return Temperature.parse(await response.json());
};

export const setTemperature = async (
	level: HeatingLevel,
	accessToken: AccessToken,
): Promise<void> => {
	console.log(`Setting temperature ${level}`);
	await fetch(`${APP_API_URL}/users/${accessToken.userId}/temperature`, {
		method: "PUT",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${accessToken.access_token}`,
		},
		body: JSON.stringify({ currentLevel: level }),
	});
};

export const currentDevice = async (
	userId: string,
	accessToken: AccessToken,
): Promise<CurrentDevice> => {
	return CurrentDevice.parse(
		await (
			await fetch(`${CLIENT_API_URL}/users/${userId}/current-device`, {
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${accessToken.access_token}`,
				},
			})
		).json(),
	);
};
