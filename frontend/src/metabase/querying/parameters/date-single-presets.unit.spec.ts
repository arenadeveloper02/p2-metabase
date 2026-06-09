import { serializeDateParameterValue } from "metabase/querying/parameters/utils/parsing";

import {
  DATE_SINGLE_RELATIVE_PRESETS,
  getDateSingleDefaultPeriodId,
  getDefaultValueForDateSinglePeriod,
} from "./date-single-presets";

describe("date-single-presets", () => {
  it("should expose rolling single-date presets", () => {
    expect(DATE_SINGLE_RELATIVE_PRESETS.map((p) => p.id)).toEqual([
      "yesterday",
      "day-before-yesterday",
      "last-day-of-previous-week",
      "last-day-of-previous-month",
    ]);
  });

  it("should treat empty default as normal", () => {
    expect(getDateSingleDefaultPeriodId(undefined)).toBe("normal");
    expect(getDefaultValueForDateSinglePeriod("normal")).toBeUndefined();
  });

  it.each([
    ["yesterday", "past1days"],
    ["day-before-yesterday", "past1days-from-1days"],
    ["last-day-of-previous-week", "past1weeks-end"],
    ["last-day-of-previous-month", "past1months-end"],
  ] as const)(
    "should map preset %s to default value %s",
    (presetId, serialized) => {
      expect(getDefaultValueForDateSinglePeriod(presetId)).toBe(serialized);
      expect(getDateSingleDefaultPeriodId(serialized)).toBe(presetId);
    },
  );
});
