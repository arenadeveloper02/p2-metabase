import { getHexColor } from "./color";

describe("getHexColor", () => {
  it("returns hex for a CSS color", () => {
    expect(getHexColor("#ff0000")).toBe("#FF0000");
  });

  it("falls back when a leftover accent8 token is stored", () => {
    expect(() => getHexColor("accent8")).not.toThrow();
    expect(getHexColor("accent8")).toMatch(/^#[0-9A-F]{6}$/i);
  });
});
