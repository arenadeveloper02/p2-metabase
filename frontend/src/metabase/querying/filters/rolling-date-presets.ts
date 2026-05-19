import { t } from "ttag";

import type {
  DatePickerShortcut,
  DatePickerTruncationUnit,
  RelativeDatePickerValue,
  ShortcutOption,
} from "metabase/querying/filters/types";

import type { Shortcut, ShortcutGroup } from "./components/RelativeDateShortcutPicker/types";

export type RollingDatePresetId =
  | "yesterday"
  | "previous-week"
  | "week-before-previous"
  | "previous-month"
  | "month-before-previous"
  | "previous-quarter"
  | "quarter-before-previous"
  | "previous-year"
  | "year-before-previous";

export type RollingDatePreset = {
  id: RollingDatePresetId;
  get label(): string;
  value: RelativeDatePickerValue;
  shortcut: DatePickerShortcut;
  direction: "past";
};

/**
 * A single completed calendar period in the past. When `periodsBefore` is 1,
 * the period before that (e.g. previous week vs week before previous).
 */
export function completedPeriodValue(
  unit: DatePickerTruncationUnit,
  periodsBefore = 0,
): RelativeDatePickerValue {
  if (periodsBefore === 0) {
    return { type: "relative", value: -1, unit };
  }

  return {
    type: "relative",
    value: -1,
    unit,
    offsetValue: -periodsBefore,
    offsetUnit: unit,
  };
}

export const ROLLING_DATE_PRESETS: RollingDatePreset[] = [
  {
    id: "yesterday",
    get label() {
      return t`Yesterday`;
    },
    shortcut: "yesterday",
    direction: "past",
    value: completedPeriodValue("day"),
  },
  {
    id: "previous-week",
    get label() {
      return t`Previous week`;
    },
    shortcut: "previous-week",
    direction: "past",
    value: completedPeriodValue("week"),
  },
  {
    id: "week-before-previous",
    get label() {
      return t`Week before previous`;
    },
    shortcut: "week-before-previous",
    direction: "past",
    value: completedPeriodValue("week", 1),
  },
  {
    id: "previous-month",
    get label() {
      return t`Previous month`;
    },
    shortcut: "previous-month",
    direction: "past",
    value: completedPeriodValue("month"),
  },
  {
    id: "month-before-previous",
    get label() {
      return t`Month before previous`;
    },
    shortcut: "month-before-previous",
    direction: "past",
    value: completedPeriodValue("month", 1),
  },
  {
    id: "previous-quarter",
    get label() {
      return t`Previous quarter`;
    },
    shortcut: "previous-quarter",
    direction: "past",
    value: completedPeriodValue("quarter"),
  },
  {
    id: "quarter-before-previous",
    get label() {
      return t`Quarter before previous`;
    },
    shortcut: "quarter-before-previous",
    direction: "past",
    value: completedPeriodValue("quarter", 1),
  },
  {
    id: "previous-year",
    get label() {
      return t`Previous year`;
    },
    shortcut: "previous-year",
    direction: "past",
    value: completedPeriodValue("year"),
  },
  {
    id: "year-before-previous",
    get label() {
      return t`Year before previous`;
    },
    shortcut: "year-before-previous",
    direction: "past",
    value: completedPeriodValue("year", 1),
  },
];

export function getRollingDatePresetShortcutGroups(): ShortcutGroup[] {
  return [
    {
      label: t`Rolling report periods`,
      columns: 2,
      shortcuts: ROLLING_DATE_PRESETS.map(
        (preset): Shortcut => ({
          label: preset.label,
          value: preset.value,
        }),
      ),
    },
  ];
}

export function getRollingDatePresetShortcutOptions(): ShortcutOption[] {
  return ROLLING_DATE_PRESETS.map((preset) => ({
    get label() {
      return preset.label;
    },
    shortcut: preset.shortcut,
    direction: preset.direction,
    value: preset.value,
  }));
}

export const ROLLING_DATE_PRESET_SHORTCUTS: DatePickerShortcut[] =
  ROLLING_DATE_PRESETS.map((preset) => preset.shortcut);
