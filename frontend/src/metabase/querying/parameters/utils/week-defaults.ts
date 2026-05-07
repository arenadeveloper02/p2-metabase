import dayjs from "dayjs";

import "metabase/lib/dayjs";
import { serializeDateParameterValue } from "metabase/querying/parameters/utils/parsing";
import type { Parameter } from "metabase-types/api";

export type WeekDefaultPreset = "last-completed-week" | "previous-week";

export type WeekDateRange = {
  start: Date;
  end: Date;
};

export function getWeekDateRange(preset: WeekDefaultPreset): WeekDateRange {
  const currentWeekStart = dayjs().startOf("isoWeek");
  const offset = preset === "previous-week" ? 2 : 1;
  const start = currentWeekStart.subtract(offset, "week").startOf("date");
  const end = start.add(6, "day");

  return { start: start.toDate(), end: end.toDate() };
}

export function getSerializedWeekDateRange(preset: WeekDefaultPreset): string {
  const { start, end } = getWeekDateRange(preset);

  return serializeDateParameterValue({
    type: "specific",
    operator: "between",
    values: [start, end],
    hasTime: false,
  });
}

export function getDateRangeDefaultPresetForParameter(
  parameter: Pick<Parameter, "slug" | "name"> & { "display-name"?: string },
): WeekDefaultPreset {
  const normalizedNames = [
    parameter.slug,
    parameter.name,
    parameter["display-name"],
  ]
    .filter((name): name is string => Boolean(name))
    .map((name) => name.toLowerCase());

  if (normalizedNames.some((name) => name.includes("previous"))) {
    return "previous-week";
  }

  return "last-completed-week";
}
