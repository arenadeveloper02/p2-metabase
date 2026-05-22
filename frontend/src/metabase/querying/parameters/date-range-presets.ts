import { t } from "ttag";

import type { RelativeDatePickerValue } from "metabase/querying/filters/types";
import {
  ROLLING_DATE_PRESETS,
  type RollingDatePresetId,
} from "metabase/querying/filters/rolling-date-presets";
import { serializeDateParameterValue } from "metabase/querying/parameters/utils/parsing";

export type DateRangeRelativePreset = {
  id: RollingDatePresetId;
  get label(): string;
  value: RelativeDatePickerValue;
};

export type DateRangeDefaultPeriodId = "normal" | RollingDatePresetId;

const DATE_RANGE_PRESET_IDS = [
  "previous-week",
  "week-before-previous",
  "previous-month",
  "month-before-previous",
] as const satisfies readonly RollingDatePresetId[];

export const DATE_RANGE_RELATIVE_PRESETS: DateRangeRelativePreset[] =
  DATE_RANGE_PRESET_IDS.map((id) => {
    const preset = ROLLING_DATE_PRESETS.find((p) => p.id === id);
    if (preset == null) {
      throw new Error(`Missing rolling date preset: ${id}`);
    }
    return {
      id: preset.id,
      get label() {
        return preset.label;
      },
      value: preset.value,
    };
  });

export const DATE_RANGE_DEFAULT_PERIOD_OPTIONS: {
  value: DateRangeDefaultPeriodId;
  get label(): string;
}[] = [
  {
    value: "normal",
    get label() {
      return t`Normal`;
    },
  },
  ...DATE_RANGE_RELATIVE_PRESETS.map((preset) => ({
    value: preset.id,
    get label() {
      return preset.label;
    },
  })),
];

export function findDateRangePresetByValue(
  value: RelativeDatePickerValue,
): DateRangeRelativePreset | undefined {
  return DATE_RANGE_RELATIVE_PRESETS.find(
    (preset) =>
      preset.value.type === value.type &&
      preset.value.value === value.value &&
      preset.value.unit === value.unit &&
      preset.value.offsetValue === value.offsetValue &&
      preset.value.offsetUnit === value.offsetUnit &&
      preset.value.options?.includeCurrent === value.options?.includeCurrent,
  );
}

export function getDateRangeDefaultPeriodId(
  defaultValue: unknown,
): DateRangeDefaultPeriodId {
  if (defaultValue == null || defaultValue === "") {
    return "normal";
  }

  if (typeof defaultValue !== "string") {
    return "normal";
  }

  const preset = DATE_RANGE_RELATIVE_PRESETS.find(
    (p) => serializeDateParameterValue(p.value) === defaultValue,
  );
  return preset?.id ?? "normal";
}

export function getDefaultValueForDateRangePeriod(
  periodId: DateRangeDefaultPeriodId,
): string | undefined {
  if (periodId === "normal") {
    return undefined;
  }

  const preset = DATE_RANGE_RELATIVE_PRESETS.find((p) => p.id === periodId);
  if (preset == null) {
    return undefined;
  }

  return serializeDateParameterValue(preset.value);
}
