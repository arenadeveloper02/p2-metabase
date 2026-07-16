import {
  formatDate,
  getDateFilterDisplayName,
} from "metabase/querying/filters/utils/dates";
import { deserializeDateParameterValue } from "metabase/querying/parameters/utils/parsing";
import {
  dateParameterValueToRange,
  dateParameterValueToSingleDate,
  resolveDateRangeParameterValueToString,
  resolveDateSingleParameterValueToString,
} from "metabase/querying/parameters/utils/relative-date-to-range";
import type { Parameter } from "metabase-types/api";
import dayjs from "dayjs";

const NUMERIC_DATE_FORMAT = "MM/DD/YYYY";

function formatIsoDateNumeric(isoDate: string) {
  return dayjs(isoDate).format(NUMERIC_DATE_FORMAT);
}

export function formatDateParameterValueNumeric(
  parameter: Parameter,
  value: string,
): string | null {
  if (parameter.type === "date/range" || parameter.type === "date/all-options") {
    const rangeStr = resolveDateRangeParameterValueToString(value);
    if (rangeStr?.includes("~")) {
      const [start, end] = rangeStr.split("~");
      if (start && end) {
        return `${formatIsoDateNumeric(start)} - ${formatIsoDateNumeric(end)}`;
      }
    }
  }

  const single = resolveDateSingleParameterValueToString(value);
  if (single) {
    return formatIsoDateNumeric(single);
  }

  return formatDateValue(parameter, value);
}

export function formatDateValue(
  parameter: Parameter,
  value: string,
): string | null {
  const filter = deserializeDateParameterValue(value);
  if (filter == null) {
    return null;
  }

  if (parameter.type === "date/single") {
    const date =
      filter.type === "relative"
        ? dateParameterValueToSingleDate(value)
        : filter.type === "specific" && filter.operator === "="
          ? filter.values[0]
          : null;

    if (date != null) {
      const hasTime =
        filter.type === "specific" && filter.operator === "="
          ? filter.hasTime
          : false;
      return formatDate(date, hasTime);
    }
  }

  if (parameter.type === "date/range") {
    const range =
      filter.type === "relative"
        ? dateParameterValueToRange(value)
        : filter.type === "specific" && filter.operator === "between"
          ? { start: filter.values[0], end: filter.values[1] }
          : null;

    if (range != null) {
      const hasTime =
        filter.type === "specific" && filter.operator === "between"
          ? filter.hasTime
          : false;
      return `${formatDate(range.start, hasTime)} - ${formatDate(range.end, hasTime)}`;
    }
  }

  return getDateFilterDisplayName(filter, {
    withPrefix: parameter.type !== "date/single",
  });
}
