import dayjs from "dayjs";
import { useState } from "react";
import { match } from "ts-pattern";
import { t } from "ttag";

import "metabase/lib/dayjs";
import {
  DateRangePicker,
  type DateRangePickerValue,
} from "metabase/querying/filters/components/DatePicker/SpecificDatePicker/DateRangePicker";
import {
  deserializeDateParameterValue,
  serializeDateParameterValue,
} from "metabase/querying/parameters/utils/parsing";
import { Button } from "metabase/ui";
import type { ParameterValueOrArray } from "metabase-types/api";

type DateRangeWidgetProps = {
  value: ParameterValueOrArray | null | undefined;
  submitButtonLabel?: string;
  defaultPreset?: "last-completed-week" | "previous-week";
  onChange: (value: string) => void;
};

export function DateRangeWidget({
  value,
  submitButtonLabel = t`Apply`,
  defaultPreset = "last-completed-week",
  onChange,
}: DateRangeWidgetProps) {
  const [pickerValue, setPickerValue] = useState(
    () => getPickerValue(value) ?? getPickerDefaultValue(defaultPreset),
  );

  const handleSubmit = () => {
    onChange(getWidgetValue(pickerValue));
  };

  return (
    <DateRangePicker
      value={pickerValue}
      hasTimeToggle
      renderSubmitButton={() => (
        <Button type="submit" variant="filled">
          {submitButtonLabel}
        </Button>
      )}
      onChange={setPickerValue}
      onSubmit={handleSubmit}
    />
  );
}

function getPickerValue(
  value: ParameterValueOrArray | null | undefined,
): DateRangePickerValue | undefined {
  return match(deserializeDateParameterValue(value))
    .returnType<DateRangePickerValue | undefined>()
    .with({ type: "specific", operator: "between" }, ({ values, hasTime }) => ({
      dateRange: [values[0], values[1]],
      hasTime,
    }))
    .otherwise(() => undefined);
}

function getPickerDefaultValue(
  preset: DateRangeWidgetProps["defaultPreset"],
): DateRangePickerValue {
  const currentWeekStart = dayjs().startOf("isoWeek");

  if (preset === "last-completed-week") {
    const start = currentWeekStart.subtract(1, "week").startOf("date");
    return { dateRange: [start.toDate(), start.add(6, "day").toDate()], hasTime: false };
  }

  if (preset === "previous-week") {
    const start = currentWeekStart.subtract(2, "week").startOf("date");
    return { dateRange: [start.toDate(), start.add(6, "day").toDate()], hasTime: false };
  }

  return {
    dateRange: [
      currentWeekStart.subtract(1, "week").startOf("date").toDate(),
      currentWeekStart.subtract(1, "week").startOf("date").add(6, "day").toDate(),
    ],
    hasTime: false,
  };
}

function getWidgetValue({ dateRange, hasTime }: DateRangePickerValue) {
  return serializeDateParameterValue({
    type: "specific",
    operator: "between",
    values: dateRange,
    hasTime,
  });
}
