import _ from "underscore";

import { getColorsForValues } from "./charts";
import { ACCENT_COUNT, color } from "./palette";

describe("charts", () => {
  it("should use accent colors for series within ACCENT_COUNT", () => {
    const keys = ["count", "profit", "sum_2"];
    const existingMapping = { count: color("accent1") };

    const newMapping = getColorsForValues(keys, existingMapping);

    expect(newMapping).toEqual({
      count: color("accent1"), // existing colors are not changed
      profit: color("feedback-positive"), // a preferred color
      sum_2: color("accent0"), // hash over the expanded accent palette
    });
  });

  it("should give stable results for series within ACCENT_COUNT", () => {
    const keys = ["count", "profit", "distinct", "sum_2"];
    const existingMapping = { count: color("accent1") };

    const newMapping = getColorsForValues(keys, existingMapping);

    expect(newMapping).toEqual({
      count: color("accent1"), // existing colors are not changed
      profit: color("feedback-positive"), // a preferred color
      distinct: color("accent6"), // some color based on the hash
      sum_2: color("accent0"), // only accent colors are used for other keys
    });
  });

  it("should use harmony colors when series exceed ACCENT_COUNT", () => {
    const keys = [
      "count",
      "sum",
      "profit",
      ..._.times(ACCENT_COUNT, (i) => `S${i}`),
    ];
    const existingMapping = { count: color("accent1") };

    const newMapping = getColorsForValues(keys, existingMapping);

    expect(newMapping).toMatchObject({
      count: color("accent1"), // existing colors are not changed
      sum: color("accent0"), // a color from the palette because accent1 would be preferred, but it's already used
      profit: color("feedback-positive"), // a preferred color
      S0: color("accent0-dark"), // the next color from palette
      S1: color("accent1-dark"), // only dark accents when keys <= ACCENT_COUNT * 2
      S2: color("accent2"),
      S3: color("accent2-dark"),
      S4: color("accent3"),
    });
  });

  it("should reuse colors when series greatly exceed ACCENT_COUNT", () => {
    const keys = ["count", "sum", "profit", ..._.times(48, (i) => `S${i}`)];
    const existingMapping = { count: color("accent1") };

    const newMapping = getColorsForValues(keys, existingMapping);

    expect(newMapping).toMatchObject({
      count: color("accent1"), // existing colors are not changed
      sum: color("accent0"), // a color from the palette because accent1 would be preferred, but it's already used
      profit: color("feedback-positive"), // a preferred color
      S0: color("accent0-light"), // the next color from palette
      S1: color("accent0-dark"), // both light and dark when keys > ACCENT_COUNT * 2
      S2: color("accent1-light"),
      S3: color("accent1-dark"),
      S4: color("accent2"),
      S28: color("accent10"),
    });
  });
});
