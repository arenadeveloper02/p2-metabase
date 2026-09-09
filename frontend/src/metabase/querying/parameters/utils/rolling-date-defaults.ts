import { t } from "ttag";

import { type Dayjs, dayjs } from "metabase/dayjs";
import type { ParameterValueOrArray } from "metabase-types/api";

type RollingDateDefault = {
  value: string;
  label: string;
  resolve: () => string;
};

function isoDate(value: Dayjs) {
  return value.startOf("day").format("YYYY-MM-DD");
}

function isoRange(start: Dayjs, end: Dayjs) {
  return `${isoDate(start)}~${isoDate(end)}`;
}

export const SINGLE_DATE_ROLLING_DEFAULTS: RollingDateDefault[] = [
  {
    value: "yesterday",
    get label() {
      return t`Yesterday`;
    },
    resolve: () => isoDate(dayjs().subtract(1, "day")),
  },
  {
    value: "day-before-yesterday",
    get label() {
      return t`Day before yesterday`;
    },
    resolve: () => isoDate(dayjs().subtract(2, "day")),
  },
  {
    value: "last-day-previous-week",
    get label() {
      return t`Last day of previous week`;
    },
    resolve: () => isoDate(dayjs().startOf("week").subtract(1, "day")),
  },
  {
    value: "last-day-previous-month",
    get label() {
      return t`Last day of previous month`;
    },
    resolve: () => isoDate(dayjs().subtract(1, "month").endOf("month")),
  },
];

export const RANGE_DATE_ROLLING_DEFAULTS: RollingDateDefault[] = [
  {
    value: "previous-week",
    get label() {
      return t`Previous week`;
    },
    resolve: () => {
      const start = dayjs().startOf("week").subtract(1, "week");
      return isoRange(start, start.endOf("week"));
    },
  },
  {
    value: "week-before-previous",
    get label() {
      return t`Week before previous`;
    },
    resolve: () => {
      const start = dayjs().startOf("week").subtract(2, "week");
      return isoRange(start, start.endOf("week"));
    },
  },
  {
    value: "previous-month",
    get label() {
      return t`Previous month`;
    },
    resolve: () => {
      const start = dayjs().subtract(1, "month").startOf("month");
      return isoRange(start, start.endOf("month"));
    },
  },
  {
    value: "month-before-previous",
    get label() {
      return t`Month before previous`;
    },
    resolve: () => {
      const start = dayjs().subtract(2, "month").startOf("month");
      return isoRange(start, start.endOf("month"));
    },
  },
];

const ALL_ROLLING_DEFAULTS = [
  ...SINGLE_DATE_ROLLING_DEFAULTS,
  ...RANGE_DATE_ROLLING_DEFAULTS,
];

export function getRollingDateDefaults(parameterType: string) {
  if (parameterType === "date/single") {
    return SINGLE_DATE_ROLLING_DEFAULTS;
  }
  if (parameterType === "date/range") {
    return RANGE_DATE_ROLLING_DEFAULTS;
  }
  return [];
}

export function getRollingDateDefaultLabel(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  return (
    ALL_ROLLING_DEFAULTS.find((shortcut) => shortcut.value === value)?.label ??
    null
  );
}

// Dashboard defaults store these tokens so published/embed dates keep rolling.
// Card queries and URL params always receive the resolved ISO value.
export function resolveRollingDateParameterValue(
  parameterType: string | undefined,
  value: ParameterValueOrArray | null | undefined,
): ParameterValueOrArray | null | undefined {
  if (parameterType !== "date/single" && parameterType !== "date/range") {
    return value;
  }

  if (typeof value !== "string") {
    return value;
  }

  const shortcut = getRollingDateDefaults(parameterType).find(
    (option) => option.value === value,
  );
  return shortcut?.resolve() ?? value;
}
