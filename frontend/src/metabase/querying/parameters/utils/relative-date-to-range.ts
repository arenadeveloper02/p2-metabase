import dayjs, { type Dayjs, type ManipulateType, type OpUnitType } from "dayjs";

import type { RelativeDatePickerValue } from "metabase/querying/filters/types";
import {
  deserializeDateParameterValue,
  serializeDateParameterValue,
} from "metabase/querying/parameters/utils/parsing";
import type { ParameterValueOrArray } from "metabase-types/api";

export type DateRangeBounds = {
  start: Date;
  end: Date;
};

type TruncationUnit = OpUnitType | "quarter";

const TRUNCATION_UNITS: TruncationUnit[] = [
  "day",
  "week",
  "month",
  "quarter",
  "year",
];

/** Date range presets always use Monday–Sunday calendar weeks. */
const DATE_RANGE_WEEK_START = 1;

function isTruncationUnit(unit: string): unit is TruncationUnit {
  return TRUNCATION_UNITS.includes(unit as TruncationUnit);
}

function withMondayWeekStart<T>(fn: () => T): T {
  const locale = dayjs.locale();
  const previousWeekStart = dayjs.Ls[locale]?.weekStart ?? 0;
  dayjs.updateLocale(locale, { weekStart: DATE_RANGE_WEEK_START });
  try {
    return fn();
  } finally {
    dayjs.updateLocale(locale, { weekStart: previousWeekStart });
  }
}

function getCompletedWeekRange(
  anchor: Dayjs,
  periodsBefore: number,
): DateRangeBounds {
  return withMondayWeekStart(() => {
    const currentWeekStart = anchor.startOf("week");
    const weekStart = currentWeekStart.subtract(periodsBefore + 1, "week");
    const weekEnd = weekStart.add(6, "day").startOf("day");
    return { start: weekStart.toDate(), end: weekEnd.toDate() };
  });
}

function getCompletedMonthRange(
  anchor: Dayjs,
  periodsBefore: number,
): DateRangeBounds {
  const monthStart = anchor
    .startOf("month")
    .subtract(periodsBefore + 1, "month");
  const monthEnd = monthStart.endOf("month").startOf("day");
  return { start: monthStart.toDate(), end: monthEnd.toDate() };
}

/**
 * Resolves a relative date filter value to inclusive calendar start/end dates.
 * Week presets use Monday through Sunday.
 */
export function relativeDateValueToRange(
  value: RelativeDatePickerValue,
  now: Dayjs = dayjs(),
): DateRangeBounds {
  const { unit, options } = value;
  const includeCurrent = options?.includeCurrent ?? false;
  const count = Math.abs(value.value);
  const isPast = value.value < 0;

  let anchor = now.startOf("day");
  if (value.offsetValue != null && value.offsetUnit != null) {
    anchor = anchor.add(value.offsetValue, value.offsetUnit as ManipulateType);
  }

  if (!isTruncationUnit(unit)) {
    return { start: anchor.toDate(), end: anchor.toDate() };
  }

  if (unit === "day" && isPast && !includeCurrent && count === 1) {
    const daysBefore =
      1 +
      (value.offsetValue != null && value.offsetUnit === "day"
        ? Math.abs(value.offsetValue)
        : 0);
    const date = now.startOf("day").subtract(daysBefore, "day");
    return { start: date.toDate(), end: date.toDate() };
  }

  if (unit === "week" && isPast && !includeCurrent && count === 1) {
    const periodsBefore =
      value.offsetValue != null && value.offsetUnit === "week"
        ? Math.abs(value.offsetValue)
        : 0;
    return getCompletedWeekRange(now.startOf("day"), periodsBefore);
  }

  if (unit === "month" && isPast && !includeCurrent && count === 1) {
    const periodsBefore =
      value.offsetValue != null && value.offsetUnit === "month"
        ? Math.abs(value.offsetValue)
        : 0;
    return getCompletedMonthRange(now.startOf("day"), periodsBefore);
  }

  if (isPast) {
    if (includeCurrent) {
      const start = anchor
        .startOf(unit)
        .subtract(count, unit as ManipulateType);
      const end = anchor.endOf(unit);
      return { start: start.toDate(), end: end.toDate() };
    }

    const end = anchor
      .startOf(unit)
      .subtract(1, unit as ManipulateType)
      .endOf(unit);
    const start = anchor.startOf(unit).subtract(count, unit as ManipulateType);
    return { start: start.toDate(), end: end.toDate() };
  }

  if (includeCurrent) {
    const start = anchor.startOf(unit);
    const end = anchor.endOf(unit).add(count - 1, unit as ManipulateType);
    return { start: start.toDate(), end: end.toDate() };
  }

  const start = anchor.startOf(unit).add(1, unit as ManipulateType);
  const end = anchor.endOf(unit).add(count, unit as ManipulateType);
  return { start: start.toDate(), end: end.toDate() };
}

export function dateParameterValueToRange(
  value: ParameterValueOrArray | null | undefined,
  now: Dayjs = dayjs(),
): DateRangeBounds | null {
  const filter = deserializeDateParameterValue(value);
  if (filter == null) {
    return null;
  }

  if (filter.type === "specific" && filter.operator === "between") {
    const [start, end] = filter.values;
    return { start, end };
  }

  if (filter.type === "relative") {
    return relativeDateValueToRange(filter, now);
  }

  return null;
}

export function dateParameterValueToSingleDate(
  value: ParameterValueOrArray | null | undefined,
  now: Dayjs = dayjs(),
): Date | null {
  const range = dateParameterValueToRange(value, now);
  return range?.start ?? null;
}

/**
 * Resolves a `date/single` parameter value to a concrete date string (e.g.
 * `2026-05-21`). Relative presets such as `past1days` are evaluated against
 * `now` so rolling defaults stay correct while URL/API params use fixed dates.
 */
export function resolveDateSingleParameterValueToString(
  value: ParameterValueOrArray | null | undefined,
  now: Dayjs = dayjs(),
): string | null {
  if (value == null || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const filter = deserializeDateParameterValue(value);
  if (filter?.type === "relative") {
    const range = dateParameterValueToRange(value, now);
    if (range == null) {
      return value;
    }

    const start = dayjs(range.start).format("YYYY-MM-DD");
    const end = dayjs(range.end).format("YYYY-MM-DD");
    if (start === end) {
      return start;
    }

    return value;
  }

  if (filter?.type === "specific" && filter.operator === "=") {
    return serializeDateParameterValue(filter) ?? null;
  }

  return value;
}

export function dateParameterValueToRangeString(
  value: ParameterValueOrArray | null | undefined,
  now: Dayjs = dayjs(),
): string | null {
  const range = dateParameterValueToRange(value, now);
  if (range == null) {
    return null;
  }

  return serializeDateParameterValue({
    type: "specific",
    operator: "between",
    values: [range.start, range.end],
    hasTime: false,
  });
}

/**
 * Resolves a `date/range` parameter value to a concrete date range string (e.g.
 * `2026-05-19~2026-05-25`). Relative presets such as `past1weeks` are evaluated
 * against `now` so rolling defaults stay correct while query params use fixed
 * dates (Monday–Sunday for week presets).
 */
export function resolveDateRangeParameterValueToString(
  value: ParameterValueOrArray | null | undefined,
  now: Dayjs = dayjs(),
): string | null {
  if (value == null || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const filter = deserializeDateParameterValue(value);
  if (filter?.type === "relative") {
    return dateParameterValueToRangeString(value, now);
  }

  if (filter?.type === "specific" && filter.operator === "between") {
    return serializeDateParameterValue(filter) ?? null;
  }

  return value;
}
