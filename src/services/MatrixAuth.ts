import axios from "axios";

export type DiscoveryInformation = {
  homeBaseUrl: URL;
  identityBaseUrl?: URL;
};

type JsonMatrixDiscoveryInformation = {
  "m.homeserver": {
    base_url: string;
  };
  "m.identity_server": {
    base_url: string;
  };
};

export async function discoverWellKnownAndVersion(
  domain: string
): Promise<DiscoveryInformation> {
  const url = new URL("/.well-known/matrix/client", `https://${domain}`);
  const client = await axios.get<JsonMatrixDiscoveryInformation>(url.href);
  const homeBaseUrl = new URL(client.data["m.homeserver"].base_url);
  const identityBaseUrl = new URL(client.data["m.identity_server"].base_url);
  await axios.get(new URL("/_matrix/client/versions", homeBaseUrl).href);
  // TODO: validate versions answer or bail out? v1.2 should be supported
  return {
    homeBaseUrl,
    identityBaseUrl,
  };
}

export async function validateToken(
  homeserver: URL,
  authToken: string
): Promise<void> {
  const url = new URL("/_matrix/client/v3/account/whoami", homeserver);
  await axios.get(url.href, {
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  });
}

type LoginInformation = {
  authToken: string;
  deviceId: string;
};

type JsonMatrixLoginReply = {
  access_token: string;
  device_id: string;
};

export async function login(
  homeserver: URL,
  username: string,
  password: string,
  deviceId?: string | null
): Promise<LoginInformation> {
  const url = new URL("/_matrix/client/v3/login", homeserver);
  const res = await axios.post<JsonMatrixLoginReply>(url.href, {
    type: "m.login.password",
    initial_device_display_name: "Pfennigfuchs",
    refresh_token: false,
    identifier: {
      type: "m.id.user",
      user: username,
    },
    password: password,
    ...(deviceId && { device_id: deviceId }),
  });
  return {
    authToken: res.data.access_token,
    deviceId: res.data.device_id,
  };
}

export async function logout(
  homeserver: URL,
  authToken: string
): Promise<void> {
  const url = new URL("/_matrix/client/v3/logout", homeserver);
  await axios.post(url.href, null, {
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  });
}
