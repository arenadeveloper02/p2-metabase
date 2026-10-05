import { getHexColor } from "metabase/viz-core/lib/color";

describe("getHexColor", () => {
  it("returns hex for a CSS color", () => {
    expect(getHexColor("#ff0000")).toBe("#FF0000");
  });

  it("resolves accent8 as a palette hex color", () => {
    expect(() => getHexColor("accent8")).not.toThrow();
    expect(getHexColor("accent8")).toMatch(/^#[0-9A-F]{6}$/i);
  });
});
