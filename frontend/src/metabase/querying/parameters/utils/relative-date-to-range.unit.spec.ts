import dayjs from "dayjs";

import type { RelativeDatePickerValue } from "metabase/querying/filters/types";
import { serializeDateParameterValue } from "metabase/querying/parameters/utils/parsing";

import {
  dateParameterValueToRange,
  relativeDateValueToRange,
  resolveDateRangeParameterValueToString,
  resolveDateSingleParameterValueToString,
} from "./relative-date-to-range";

const NOW = dayjs("2016-06-07T12:13:55");

function formatDate(date: Date) {
  return dayjs(date).format("YYYY-MM-DD");
}

function expectRange(
  value: RelativeDatePickerValue,
  expected: { start: string; end: string },
  now: dayjs.Dayjs = NOW,
) {
  const { start, end } = relativeDateValueToRange(value, now);
  expect(formatDate(start)).toBe(expected.start);
  expect(formatDate(end)).toBe(expected.end);
}

describe("relativeDateValueToRange", () => {
  beforeEach(() => {
    dayjs.updateLocale("en", { weekStart: 1 });
  });

  it("should resolve past days", () => {
    expectRange(
      { type: "relative", value: -3, unit: "day" },
      { start: "2016-06-04", end: "2016-06-06" },
    );
  });

  it("should resolve yesterday as a single day", () => {
    expectRange(
      { type: "relative", value: -1, unit: "day" },
      { start: "2016-06-06", end: "2016-06-06" },
    );
  });

  it("should resolve day before yesterday as a single day", () => {
    expectRange(
      {
        type: "relative",
        value: -1,
        unit: "day",
        offsetValue: -1,
        offsetUnit: "day",
      },
      { start: "2016-06-05", end: "2016-06-05" },
    );
  });

  it("should resolve past days including current", () => {
    expectRange(
      {
        type: "relative",
        value: -3,
        unit: "day",
        options: { includeCurrent: true },
      },
      { start: "2016-06-04", end: "2016-06-07" },
    );
  });

  it("should resolve previous week as Monday through Sunday", () => {
    expectRange(
      { type: "relative", value: -1, unit: "week" },
      { start: "2016-05-30", end: "2016-06-05" },
    );
  });

  it("should resolve week before previous", () => {
    expectRange(
      {
        type: "relative",
        value: -1,
        unit: "week",
        offsetValue: -1,
        offsetUnit: "week",
      },
      { start: "2016-05-23", end: "2016-05-29" },
    );
  });

  it("should resolve previous month", () => {
    expectRange(
      { type: "relative", value: -1, unit: "month" },
      { start: "2016-05-01", end: "2016-05-31" },
    );
  });

  it("should resolve month before previous", () => {
    expectRange(
      {
        type: "relative",
        value: -1,
        unit: "month",
        offsetValue: -1,
        offsetUnit: "month",
      },
      { start: "2016-04-01", end: "2016-04-30" },
    );
  });

  it("should resolve past interval with offset", () => {
    expectRange(
      {
        type: "relative",
        value: -3,
        unit: "day",
        offsetValue: -3,
        offsetUnit: "year",
      },
      { start: "2013-06-04", end: "2013-06-06" },
    );
  });
});

describe("dateParameterValueToRange", () => {
  beforeEach(() => {
    dayjs.updateLocale("en", { weekStart: 1 });
  });

  it("should resolve absolute date ranges", () => {
    const range = dateParameterValueToRange("2020-02-15~2020-03-05", NOW);
    expect(range).toEqual({
      start: dayjs("2020-02-15").toDate(),
      end: dayjs("2020-03-05").toDate(),
    });
  });

  it("should resolve relative parameter strings", () => {
    const range = dateParameterValueToRange("past1weeks", NOW);
    expect(formatDate(range!.start)).toBe("2016-05-30");
    expect(formatDate(range!.end)).toBe("2016-06-05");
  });

  it("should round-trip rolling presets", () => {
    const value = serializeDateParameterValue({
      type: "relative",
      value: -1,
      unit: "week",
      offsetValue: -1,
      offsetUnit: "week",
    });
    expect(value).toBe("past1weeks-from-1weeks");
    const range = dateParameterValueToRange(value, NOW);
    expect(formatDate(range!.start)).toBe("2016-05-23");
    expect(formatDate(range!.end)).toBe("2016-05-29");
  });
});

describe("resolveDateSingleParameterValueToString", () => {
  beforeEach(() => {
    dayjs.updateLocale("en", { weekStart: 1 });
  });

  it.each([
    ["past1days", "2016-06-06"],
    ["past1days-from-1days", "2016-06-05"],
    ["yesterday", "2016-06-06"],
  ] as const)("should resolve %s to %s", (value, expected) => {
    expect(resolveDateSingleParameterValueToString(value, NOW)).toBe(expected);
  });

  it("should preserve fixed date values", () => {
    expect(resolveDateSingleParameterValueToString("2020-02-15", NOW)).toBe(
      "2020-02-15",
    );
  });

  it("should not resolve date range strings", () => {
    expect(resolveDateSingleParameterValueToString("past1weeks", NOW)).toBe(
      "past1weeks",
    );
  });
});

describe("resolveDateRangeParameterValueToString", () => {
  beforeEach(() => {
    dayjs.updateLocale("en", { weekStart: 1 });
  });

  it.each([
    ["past1weeks", "2016-05-30~2016-06-05"],
    ["past1weeks-from-1weeks", "2016-05-23~2016-05-29"],
    ["past1months", "2016-05-01~2016-05-31"],
    ["past1months-from-1months", "2016-04-01~2016-04-30"],
  ] as const)("should resolve %s to %s", (value, expected) => {
    expect(resolveDateRangeParameterValueToString(value, NOW)).toBe(expected);
  });

  it("should preserve fixed date range values", () => {
    expect(
      resolveDateRangeParameterValueToString("2020-02-15~2020-03-05", NOW),
    ).toBe("2020-02-15~2020-03-05");
  });

  it("should resolve single-day relative strings to a one-day range", () => {
    expect(resolveDateRangeParameterValueToString("past1days", NOW)).toBe(
      "2016-06-06~2016-06-06",
    );
  });
});
