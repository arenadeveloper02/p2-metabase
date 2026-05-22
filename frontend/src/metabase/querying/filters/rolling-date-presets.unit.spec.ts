import {
  ROLLING_DATE_PRESETS,
  completedPeriodValue,
} from "metabase/querying/filters/rolling-date-presets";
import {
  deserializeDateParameterValue,
  serializeDateParameterValue,
} from "metabase/querying/parameters/utils/parsing";

describe("rolling-date-presets", () => {
  it.each([
    {
      presetId: "yesterday",
      serialized: "past1days",
    },
    {
      presetId: "previous-week",
      serialized: "past1weeks",
    },
    {
      presetId: "week-before-previous",
      serialized: "past1weeks-from-1weeks",
    },
    {
      presetId: "previous-month",
      serialized: "past1months",
    },
    {
      presetId: "month-before-previous",
      serialized: "past1months-from-1months",
    },
    {
      presetId: "previous-quarter",
      serialized: "past1quarters",
    },
    {
      presetId: "quarter-before-previous",
      serialized: "past1quarters-from-1quarters",
    },
    {
      presetId: "previous-year",
      serialized: "past1years",
    },
    {
      presetId: "year-before-previous",
      serialized: "past1years-from-1years",
    },
  ] as const)(
    "should round-trip preset $presetId as $serialized",
    ({ presetId, serialized }) => {
      const preset = ROLLING_DATE_PRESETS.find((p) => p.id === presetId);
      expect(preset).toBeDefined();
      expect(serializeDateParameterValue(preset!.value)).toEqual(serialized);
      expect(deserializeDateParameterValue(serialized)).toEqual(preset!.value);
    },
  );

  it("completedPeriodValue should not include offset fields for the first period", () => {
    expect(completedPeriodValue("week")).toEqual({
      type: "relative",
      value: -1,
      unit: "week",
    });
  });

  it("completedPeriodValue should include offset fields for earlier periods", () => {
    expect(completedPeriodValue("week", 1)).toEqual({
      type: "relative",
      value: -1,
      unit: "week",
      offsetValue: -1,
      offsetUnit: "week",
    });
  });
});
