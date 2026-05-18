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

const TRUNCATION_UNITS: OpUnitType[] = [
  "day",
  "week",
  "month",
  "quarter",
  "year",
];

function isTruncationUnit(unit: string): unit is OpUnitType {
  return TRUNCATION_UNITS.includes(unit as OpUnitType);
}

/**
 * Resolves a relative date filter value to inclusive calendar start/end dates,
 * matching metabase.query-processor.parameters.dates/date-string->range for
 * day/week/month/quarter/year truncation units.
 */
export function relativeDateValueToRange(
  value: RelativeDatePickerValue,
  now: Dayjs = dayjs(),
): DateRangeBounds {
  const { unit, options } = value;
  const includeCurrent = options?.includeCurrent ?? false;
  const count = Math.abs(value.value);
  const isPast = value.value < 0;

  let anchor = now;
  if (value.offsetValue != null && value.offsetUnit != null) {
    anchor = now.add(value.offsetValue, value.offsetUnit as ManipulateType);
  }

  if (!isTruncationUnit(unit)) {
    return { start: anchor.toDate(), end: anchor.toDate() };
  }

  if (isPast) {
    if (includeCurrent) {
      const start = anchor.startOf(unit).subtract(count, unit as ManipulateType);
      const end = anchor.endOf(unit);
      return { start: start.toDate(), end: end.toDate() };
    }

    const end = anchor.startOf(unit).subtract(1, unit as ManipulateType).endOf(unit);
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
