import { describe, it, expect } from "vitest";
import {
  discoverWellKnownAndVersion,
  login,
  logout,
  validateToken,
} from "@/services/MatrixAuth";
import axios from "axios";

describe.skip("room attribute tests", () => {
  const user1 = {
    username: import.meta.env.VITE_USR_NAME_1,
    password: import.meta.env.VITE_USR_PASSWORD_1,
  };
  const user2 = {
    username: import.meta.env.VITE_USR_NAME_2,
    password: import.meta.env.VITE_USR_PASSWORD_2,
  };
  const roomId = "!kJFYmmvuTafGdqnsJY:matrix.org";

  it("test accesibility of payment_info", async () => {
    const { homeBaseUrl } = await discoverWellKnownAndVersion("matrix.org");
    const { authToken } = await login(
      homeBaseUrl,
      user1.username,
      user1.password,
      null
    );
    await validateToken(homeBaseUrl, authToken);

    const url = new URL(
      `/_matrix/client/v3/rooms/${roomId}/state/p.room.payment_info/@${user1.username}:matrix.org`,
      homeBaseUrl.origin
    );

    const get = await axios.get(url.href, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
    // Users are able to read their payment_info
    expect(get.status).toEqual(200);

    const put = await axios.put(
      url.href,
      {
        IBAN: 3984576,
        Paypal: "sdlfkjh",
      },
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    // Users are able to edit their payment_info
    expect(put.status).toEqual(200);

    await logout(homeBaseUrl, authToken);
  }, 100000);

  it("test accesibility of payment_info", async () => {
    const { homeBaseUrl } = await discoverWellKnownAndVersion("matrix.org");
    const { authToken } = await login(
      homeBaseUrl,
      user2.username,
      user2.password,
      null
    );
    await validateToken(homeBaseUrl, authToken);

    const url = new URL(
      `/_matrix/client/v3/rooms/${roomId}/state/p.room.payment_info/@${user1.username}:matrix.org`,
      homeBaseUrl.origin
    );

    const get = await axios.get(url.href, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
    // Users are able to read others payment_info
    expect(get.status).toEqual(200);

    // Users are not able to edit others payment_info
    await expect(
      axios.put(
        url.href,
        {
          IBAN: 3984576,
          Paypal: "sdlfkjh",
        },
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      )
    ).rejects.toThrowError("Request failed with status code 403");

    await logout(homeBaseUrl, authToken);
  }, 100000);
});
