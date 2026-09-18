import { dayjs } from "metabase/dayjs";

import {
  getRollingDateDefaultLabel,
  resolveRollingDateParameterValue,
} from "./rolling-date-defaults";

describe("rolling-date-defaults", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2025-03-12T15:00:00"));
    // Sunday week start must not affect rolling week ranges.
    dayjs.updateLocale(dayjs.locale(), { weekStart: 0 });
  });

  afterEach(() => {
    jest.useRealTimers();
    dayjs.updateLocale(dayjs.locale(), { weekStart: 1 });
  });

  describe("resolveRollingDateParameterValue", () => {
    it.each([
      ["yesterday", "2025-03-11"],
      ["day-before-yesterday", "2025-03-10"],
      ["last-day-previous-week", "2025-03-09"],
      ["last-day-previous-month", "2025-02-28"],
    ])("resolves date/single %s", (value, expected) => {
      expect(resolveRollingDateParameterValue("date/single", value)).toEqual(
        expected,
      );
    });

    it.each([
      ["previous-week", "2025-03-03~2025-03-09"],
      ["week-before-previous", "2025-02-24~2025-03-02"],
      ["previous-month", "2025-02-01~2025-02-28"],
      ["month-before-previous", "2025-01-01~2025-01-31"],
    ])("resolves date/range %s", (value, expected) => {
      expect(resolveRollingDateParameterValue("date/range", value)).toEqual(
        expected,
      );
    });

    it("leaves ISO values unchanged", () => {
      expect(
        resolveRollingDateParameterValue("date/single", "2025-02-01"),
      ).toEqual("2025-02-01");
      expect(
        resolveRollingDateParameterValue("date/range", "2025-02-01~2025-02-28"),
      ).toEqual("2025-02-01~2025-02-28");
    });

    it("does not resolve rolling tokens for other date widgets", () => {
      expect(
        resolveRollingDateParameterValue("date/relative", "yesterday"),
      ).toEqual("yesterday");
    });
  });

  describe("getRollingDateDefaultLabel", () => {
    it("returns the editor label for a rolling token", () => {
      expect(getRollingDateDefaultLabel("yesterday")).toEqual("Yesterday");
      expect(getRollingDateDefaultLabel("previous-month")).toEqual(
        "Previous month",
      );
    });

    it("returns null for ISO values", () => {
      expect(getRollingDateDefaultLabel("2025-02-01")).toBeNull();
    });
  });
});
