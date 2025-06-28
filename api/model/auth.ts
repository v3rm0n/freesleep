import * as z from "zod/v4";

export const Login = z.object({
	client_id: z.string(),
	client_secret: z.string(),
	grant_type: z.literal("password"),
	username: z.email(),
	password: z.string(),
});

export type Login = z.infer<typeof Login>;

export const AccessToken = z.object({
	access_token: z.string(),
	token_type: z.string(),
	expires_in: z.number(),
	refresh_token: z.string(),
	userId: z.string(),
});

export type AccessToken = z.infer<typeof AccessToken>;
