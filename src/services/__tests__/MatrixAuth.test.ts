import { describe, it, afterAll, afterEach, beforeAll } from "vitest";
import { setupServer } from "msw/node";
import { allHandlers } from "@/mocks/matrix";
import {
  discoverWellKnownAndVersion,
  login,
  logout,
  validateToken,
} from "@/services/MatrixAuth";

const server = setupServer(...allHandlers);

describe("matrix protocol tests", () => {
  beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
  afterAll(() => server.close());
  afterEach(() => server.resetHandlers());

  it("test discover, login, validate and logout", async () => {
    const { homeBaseUrl } = await discoverWellKnownAndVersion("matrix.org");
    const { authToken } = await login(homeBaseUrl, "user", "asdfdsa", null);
    await validateToken(homeBaseUrl, authToken);
    await logout(homeBaseUrl, authToken);
  });
});
