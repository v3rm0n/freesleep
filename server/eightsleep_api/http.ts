import type * as z from "zod/v4";
import {
	type AccessToken,
	CurrentDevice,
	type Device,
	DeviceResponse,
	type HeatingLevel,
	type Login,
	Temperature,
	TokenResponse,
	type User,
	type UserId,
	UserResponse,
} from "./model/index.ts";

const AUTH_API_URL = "https://auth-api.8slp.net/v1/tokens";
const APP_API_URL = "https://app-api.8slp.net/v1";
const CLIENT_API_URL = "https://client-api.8slp.net/v1";

/** A non-2xx response from the Eight Sleep API. */
export class EightSleepApiError extends Error {
	constructor(
		readonly status: number,
		message: string,
	) {
		super(message);
		this.name = "EightSleepApiError";
	}
}

/**
 * `fetch` with the JSON and bearer headers the API expects. Throws
 * `EightSleepApiError` on a non-2xx status instead of handing an error body to
 * the callers' schema parsers.
 */
const request = async (
	url: string,
	accessToken?: AccessToken,
	init: RequestInit = {},
): Promise<Response> => {
	const response = await fetch(url, {
		...init,
		headers: {
			"Content-Type": "application/json",
			...(accessToken
				? { Authorization: `Bearer ${accessToken.access_token}` }
				: {}),
		},
	});
	if (!response.ok) {
		throw new EightSleepApiError(
			response.status,
			`${init.method ?? "GET"} ${url} failed with status ${response.status}`,
		);
	}
	return response;
};

const requestJson = async <T>(
	schema: z.ZodType<T>,
	url: string,
	accessToken?: AccessToken,
	init?: RequestInit,
): Promise<T> => {
	const response = await request(url, accessToken, init);
	return schema.parse(await response.json());
};

export const login = async (login: Login): Promise<AccessToken> => {
	console.log(`Logging in as ${login.username}`);
	const token = await requestJson(TokenResponse, AUTH_API_URL, undefined, {
		method: "POST",
		body: JSON.stringify(login),
	});
	console.log(`Logged in as ${login.username}, userId: ${token.userId}`);
	return { ...token, expires_at: Date.now() + token.expires_in * 1000 };
};

export const me = async (accessToken: AccessToken): Promise<User> => {
	const response = await requestJson(
		UserResponse,
		`${CLIENT_API_URL}/users/me`,
		accessToken,
	);
	return response.user;
};

export const device = async (
	deviceId: string,
	accessToken: AccessToken,
): Promise<Device> => {
	const response = await requestJson(
		DeviceResponse,
		`${CLIENT_API_URL}/devices/${deviceId}`,
		accessToken,
	);
	return response.result;
};

export const getTemperature = (
	userId: UserId,
	accessToken: AccessToken,
): Promise<Temperature> =>
	requestJson(
		Temperature,
		`${APP_API_URL}/users/${userId}/temperature`,
		accessToken,
	);

export const setTemperature = async (
	userId: UserId,
	level: HeatingLevel,
	accessToken: AccessToken,
): Promise<void> => {
	console.log(`Setting heating level ${level} for ${userId}`);
	await request(`${APP_API_URL}/users/${userId}/temperature`, accessToken, {
		method: "PUT",
		body: JSON.stringify({ currentLevel: level }),
	});
};

export const currentDevice = (
	userId: UserId,
	accessToken: AccessToken,
): Promise<CurrentDevice> =>
	requestJson(
		CurrentDevice,
		`${CLIENT_API_URL}/users/${userId}/current-device`,
		accessToken,
	);
