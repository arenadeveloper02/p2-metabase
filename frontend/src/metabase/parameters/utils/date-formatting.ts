import {
  formatDate,
  getDateFilterDisplayName,
} from "metabase/querying/filters/utils/dates";
import { deserializeDateParameterValue } from "metabase/querying/parameters/utils/parsing";
import { dateParameterValueToRange } from "metabase/querying/parameters/utils/relative-date-to-range";
import type { Parameter } from "metabase-types/api";

export function formatDateValue(
  parameter: Parameter,
  value: string,
): string | null {
  const filter = deserializeDateParameterValue(value);
  if (filter == null) {
    return null;
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
