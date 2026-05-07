import dayjs from "dayjs";

import "metabase/lib/dayjs";

import {
  getDateRangeDefaultPresetForParameter,
  getSerializedWeekDateRange,
  getWeekDateRange,
} from "./week-defaults";

describe("week-defaults", () => {
  describe("getWeekDateRange", () => {
    it("returns Mon-Sun of the last completed ISO week for last-completed-week", () => {
      const { start, end } = getWeekDateRange("last-completed-week");
      const expectedStart = dayjs().startOf("isoWeek").subtract(1, "week");

      expect(dayjs(start).format("YYYY-MM-DD")).toBe(
        expectedStart.format("YYYY-MM-DD"),
      );
      expect(dayjs(end).format("YYYY-MM-DD")).toBe(
        expectedStart.add(6, "day").format("YYYY-MM-DD"),
      );
    });

    it("returns Mon-Sun of the week before last for previous-week", () => {
      const { start, end } = getWeekDateRange("previous-week");
      const expectedStart = dayjs().startOf("isoWeek").subtract(2, "week");

      expect(dayjs(start).format("YYYY-MM-DD")).toBe(
        expectedStart.format("YYYY-MM-DD"),
      );
      expect(dayjs(end).format("YYYY-MM-DD")).toBe(
        expectedStart.add(6, "day").format("YYYY-MM-DD"),
      );
    });
  });

  describe("getSerializedWeekDateRange", () => {
    it("serializes last completed week as start~end", () => {
      const result = getSerializedWeekDateRange("last-completed-week");
      const start = dayjs().startOf("isoWeek").subtract(1, "week");
      const end = start.add(6, "day");

      expect(result).toBe(
        `${start.format("YYYY-MM-DD")}~${end.format("YYYY-MM-DD")}`,
      );
    });

    it("serializes previous week as start~end", () => {
      const result = getSerializedWeekDateRange("previous-week");
      const start = dayjs().startOf("isoWeek").subtract(2, "week");
      const end = start.add(6, "day");

      expect(result).toBe(
        `${start.format("YYYY-MM-DD")}~${end.format("YYYY-MM-DD")}`,
      );
    });
  });

  describe("getDateRangeDefaultPresetForParameter", () => {
    it("detects previous week from name", () => {
      expect(
        getDateRangeDefaultPresetForParameter({
          slug: "prev_date",
          name: "Previous Date",
        }),
      ).toBe("previous-week");
    });

    it("detects current week from name", () => {
      expect(
        getDateRangeDefaultPresetForParameter({
          slug: "current_date",
          name: "Current Date",
        }),
      ).toBe("last-completed-week");
    });

    it("falls back to last-completed-week for unknown names", () => {
      expect(
        getDateRangeDefaultPresetForParameter({
          slug: "unrelated",
          name: "Unrelated",
        }),
      ).toBe("last-completed-week");
    });
  });
});
