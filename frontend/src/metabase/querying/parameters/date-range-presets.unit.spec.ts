import { serializeDateParameterValue } from "metabase/querying/parameters/utils/parsing";

import {
  DATE_RANGE_RELATIVE_PRESETS,
  getDateRangeDefaultPeriodId,
  getDefaultValueForDateRangePeriod,
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

  it("should treat empty default as normal", () => {
    expect(getDateRangeDefaultPeriodId(undefined)).toBe("normal");
    expect(getDefaultValueForDateRangePeriod("normal")).toBeUndefined();
  });

  it.each([
    ["previous-week", "past1weeks"],
    ["week-before-previous", "past1weeks-from-1weeks"],
    ["previous-month", "past1months"],
    ["month-before-previous", "past1months-from-1months"],
  ] as const)(
    "should map preset %s to default value %s",
    (presetId, serialized) => {
      expect(getDefaultValueForDateRangePeriod(presetId)).toBe(serialized);
      expect(getDateRangeDefaultPeriodId(serialized)).toBe(presetId);
    },
  );

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
