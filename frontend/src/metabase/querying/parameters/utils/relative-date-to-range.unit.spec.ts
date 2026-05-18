import dayjs from "dayjs";

import type { RelativeDatePickerValue } from "metabase/querying/filters/types";
import { serializeDateParameterValue } from "metabase/querying/parameters/utils/parsing";

import {
  dateParameterValueToRange,
  relativeDateValueToRange,
} from "./relative-date-to-range";

const NOW = dayjs("2016-06-07T12:13:55");

function formatDate(date: Date) {
  return dayjs(date).format("YYYY-MM-DD");
}

function expectRange(
  value: RelativeDatePickerValue,
  expected: { start: string; end: string },
) {
  const { start, end } = relativeDateValueToRange(value, NOW);
  expect(formatDate(start)).toBe(expected.start);
  expect(formatDate(end)).toBe(expected.end);
}

describe("relativeDateValueToRange", () => {
  beforeEach(() => {
    dayjs.updateLocale("en", { weekStart: 0 });
  });

  it("should resolve past days", () => {
    expectRange(
      { type: "relative", value: -3, unit: "day" },
      { start: "2016-06-04", end: "2016-06-06" },
    );
  });

  it("should resolve past days including current", () => {
    expectRange(
      { type: "relative", value: -3, unit: "day", options: { includeCurrent: true } },
      { start: "2016-06-04", end: "2016-06-07" },
    );
  });

  it("should resolve past weeks", () => {
    expectRange(
      { type: "relative", value: -1, unit: "week" },
      { start: "2016-05-29", end: "2016-06-04" },
    );
  });

  it("should resolve past two weeks", () => {
    expectRange(
      { type: "relative", value: -2, unit: "week" },
      { start: "2016-05-22", end: "2016-06-04" },
    );
  });

  it("should resolve past week with offset", () => {
    expectRange(
      {
        type: "relative",
        value: -1,
        unit: "week",
        offsetValue: -1,
        offsetUnit: "week",
      },
      { start: "2016-05-22", end: "2016-05-28" },
    );
  });

  it("should resolve past months", () => {
    expectRange(
      { type: "relative", value: -2, unit: "month" },
      { start: "2016-04-01", end: "2016-05-31" },
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
    dayjs.updateLocale("en", { weekStart: 0 });
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
    expect(formatDate(range!.start)).toBe("2016-05-29");
    expect(formatDate(range!.end)).toBe("2016-06-04");
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
    expect(formatDate(range!.start)).toBe("2016-05-22");
    expect(formatDate(range!.end)).toBe("2016-05-28");
  });
});
