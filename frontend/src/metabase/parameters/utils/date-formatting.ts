import { getDateFilterDisplayName } from "metabase/querying/filters/utils/dates";
import { deserializeDateParameterValue } from "metabase/querying/parameters/utils/parsing";
import { getRollingDateDefaultLabel } from "metabase/querying/parameters/utils/rolling-date-defaults";
import type {
  DateFormattingSettings,
  Parameter,
  ParameterValueOrArray,
} from "metabase-types/api";

export function formatDateValue(
  parameter: Parameter,
  value: ParameterValueOrArray | null | undefined,
  formattingSettings?: DateFormattingSettings,
): string | null {
  const rollingLabel = getRollingDateDefaultLabel(value);
  if (rollingLabel != null) {
    return rollingLabel;
  }

  const filter = deserializeDateParameterValue(value);
  if (filter == null) {
    return null;
  }

  return getDateFilterDisplayName(filter, {
    withPrefix: parameter.type !== "date/single",
    formattingSettings,
  });
}
