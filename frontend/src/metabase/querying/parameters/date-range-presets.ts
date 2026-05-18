import type { RelativeDatePickerValue } from "metabase/querying/filters/types";
import {
  ROLLING_DATE_PRESETS,
  type RollingDatePresetId,
} from "metabase/querying/filters/rolling-date-presets";

export type DateRangeRelativePreset = {
  id: RollingDatePresetId;
  get label(): string;
  value: RelativeDatePickerValue;
};

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

export const DEFAULT_DATE_RANGE_RELATIVE_VALUE: RelativeDatePickerValue =
  DATE_RANGE_RELATIVE_PRESETS[0].value;

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
