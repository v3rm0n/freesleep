import { Credentials,AccessToken, UserResponse } from "./api.ts";

const AUTH_API_URL = "https://auth-api.8slp.net/v1/tokens";
const APP_API_URL = "https://app-api.8slp.net";
const CLIENT_API_URL = "https://client-api.8slp.net/v1";
const CLIENT_ID = "0894c7f33bb94800a03f1f4df13a4f38";
const CLIENT_SECRET = "f0954a3ed5763ba3d06834c73731a32f15f168f47d4f164751275def86db0c76";

export const login = async (creds:  Credentials): Promise<typeof AccessToken> => {
  return (await fetch(AUTH_API_URL,{method:"POST",body:JSON.stringify({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    grant_type: "password",
    ...creds
  }),headers:{'Content-Type':'application/json'}})).json();
};

export const me = async (accessToken:  AccessToken): Promise<UserResponse> => {
  return (await fetch(`${CLIENT_API_URL}/users/me`,{
    headers:{
      'Content-Type':'application/json',
    'Authorization': `Bearer ${accessToken.access_token}`
    }})).json();
};
