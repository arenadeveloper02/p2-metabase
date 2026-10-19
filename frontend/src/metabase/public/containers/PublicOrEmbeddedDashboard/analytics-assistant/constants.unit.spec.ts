import {
  analyticsAssistantEndpoint,
  embeddedDashboardToken,
  publicDashboardUuid,
} from "./constants";

describe("embeddedDashboardToken", () => {
  it("reads the token from an embed dashboard link", () => {
    expect(embeddedDashboardToken("/embed/dashboard/abc.def")).toBe("abc.def");
    expect(embeddedDashboardToken("/prefix/embed/dashboard/abc.def")).toBe(
      "abc.def",
    );
    expect(embeddedDashboardToken("/public/dashboard/uuid")).toBeNull();
  });
});

describe("publicDashboardUuid", () => {
  it("reads the uuid from a public dashboard link", () => {
    expect(publicDashboardUuid("/public/dashboard/abc")).toBe("abc");
    expect(publicDashboardUuid("/public/dashboard/abc/overview")).toBe("abc");
    expect(publicDashboardUuid("/embed/dashboard/token")).toBeNull();
  });
});

describe("analyticsAssistantEndpoint", () => {
  it("posts embed links and public links to their same-origin proxies", () => {
    expect(analyticsAssistantEndpoint({ token: "a/b" })).toBe(
      "/api/embed/dashboard/a%2Fb/analytics-assistant",
    );
    expect(analyticsAssistantEndpoint({ uuid: "abc" })).toBe(
      "/api/public/dashboard/abc/analytics-assistant",
    );
  });
});
