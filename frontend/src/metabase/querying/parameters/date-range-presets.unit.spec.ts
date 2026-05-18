import { serializeDateParameterValue } from "metabase/querying/parameters/utils/parsing";

import {
  DATE_RANGE_RELATIVE_PRESETS,
  DEFAULT_DATE_RANGE_RELATIVE_VALUE,
} from "./date-range-presets";

describe("date-range-presets", () => {
  it("should expose exactly four rolling period presets", () => {
    expect(DATE_RANGE_RELATIVE_PRESETS.map((p) => p.id)).toEqual([
      "previous-week",
      "week-before-previous",
      "previous-month",
      "month-before-previous",
    ]);
  });

  it("should default to previous week", () => {
    expect(serializeDateParameterValue(DEFAULT_DATE_RANGE_RELATIVE_VALUE)).toBe(
      "past1weeks",
    );
  });

  it.each([
    ["previous-week", "past1weeks"],
    ["week-before-previous", "past1weeks-from-1weeks"],
    ["previous-month", "past1months"],
    ["month-before-previous", "past1months-from-1months"],
  ] as const)(
    "should serialize preset %s as %s",
    (presetId, serialized) => {
      const preset = DATE_RANGE_RELATIVE_PRESETS.find((p) => p.id === presetId);
      expect(serializeDateParameterValue(preset!.value)).toBe(serialized);
    },
  );
});
