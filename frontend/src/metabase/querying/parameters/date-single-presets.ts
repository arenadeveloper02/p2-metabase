import { t } from "ttag";

import { completedPeriodValue } from "metabase/querying/filters/rolling-date-presets";
import type {
  DatePickerTruncationUnit,
  RelativeDatePickerValue,
} from "metabase/querying/filters/types";
import { serializeDateParameterValue } from "metabase/querying/parameters/utils/parsing";

export type DateSingleRelativePresetId =
  | "yesterday"
  | "day-before-yesterday"
  | "last-day-of-previous-week"
  | "last-day-of-previous-month";

/** Last calendar day of a completed week (Sun) or month, using Mon–Sun weeks. */
export function lastDayOfCompletedPeriodValue(
  unit: Extract<DatePickerTruncationUnit, "week" | "month">,
): RelativeDatePickerValue {
  return {
    type: "relative",
    value: -1,
    unit,
    options: { usePeriodEnd: true },
  };
}

export type DateSingleRelativePreset = {
  id: DateSingleRelativePresetId;
  get label(): string;
  value: RelativeDatePickerValue;
};

export const DATE_SINGLE_RELATIVE_PRESETS: DateSingleRelativePreset[] = [
  {
    id: "yesterday",
    get label() {
      return t`Yesterday`;
    },
    value: completedPeriodValue("day"),
  },
  {
    id: "day-before-yesterday",
    get label() {
      return t`Day before yesterday`;
    },
    value: completedPeriodValue("day", 1),
  },
  {
    id: "last-day-of-previous-week",
    get label() {
      return t`Last day of previous week`;
    },
    value: lastDayOfCompletedPeriodValue("week"),
  },
  {
    id: "last-day-of-previous-month",
    get label() {
      return t`Last day of previous month`;
    },
    value: lastDayOfCompletedPeriodValue("month"),
  },
];

export type DateSingleDefaultPeriodId = "normal" | DateSingleRelativePresetId;

export const DATE_SINGLE_DEFAULT_PERIOD_OPTIONS: {
  value: DateSingleDefaultPeriodId;
  get label(): string;
}[] = [
  {
    value: "normal",
    get label() {
      return t`Normal`;
    },
  },
  ...DATE_SINGLE_RELATIVE_PRESETS.map((preset) => ({
    value: preset.id,
    get label() {
      return preset.label;
    },
  })),
];

export function getDateSingleDefaultPeriodId(
  defaultValue: unknown,
): DateSingleDefaultPeriodId {
  if (defaultValue == null || defaultValue === "") {
    return "normal";
  }

  if (typeof defaultValue !== "string") {
    return "normal";
  }

  const preset = DATE_SINGLE_RELATIVE_PRESETS.find(
    (p) => serializeDateParameterValue(p.value) === defaultValue,
  );
  return preset?.id ?? "normal";
}

export function getDefaultValueForDateSinglePeriod(
  periodId: DateSingleDefaultPeriodId,
): string | undefined {
  if (periodId === "normal") {
    return undefined;
  }

  const preset = DATE_SINGLE_RELATIVE_PRESETS.find((p) => p.id === periodId);
  if (preset == null) {
    return undefined;
  }

  return serializeDateParameterValue(preset.value);
}
