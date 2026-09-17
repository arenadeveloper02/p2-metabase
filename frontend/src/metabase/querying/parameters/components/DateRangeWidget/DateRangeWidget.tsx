import { useState } from "react";
import { match } from "ts-pattern";
import { t } from "ttag";

import { dayjs } from "metabase/dayjs";
import {
  DateRangePicker,
  type DateRangePickerValue,
} from "metabase/querying/common/components/DatePicker/SpecificDatePicker/DateRangePicker";
import type { DatePickerOperator } from "metabase/querying/common/types";
import { RollingDateDefaultShortcuts } from "metabase/querying/parameters/components/RollingDateDefaultShortcuts";
import {
  deserializeDateParameterValue,
  serializeDateParameterValue,
} from "metabase/querying/parameters/utils/parsing";
import { Button } from "metabase/ui";
import type { ParameterValueOrArray } from "metabase-types/api";

type DateRangeWidgetProps = {
  value: ParameterValueOrArray | null | undefined;
  submitButtonLabel?: string;
  showRollingDefaults?: boolean;
  availableOperators?: DatePickerOperator[];
  onChange: (value: string) => void;
};

export function DateRangeWidget({
  value,
  submitButtonLabel = t`Apply`,
  showRollingDefaults = false,
  onChange,
}: DateRangeWidgetProps) {
  const [pickerValue, setPickerValue] = useState(
    () => getPickerValue(value) ?? getPickerDefaultValue(),
  );

  const handleSubmit = () => {
    onChange(getWidgetValue(pickerValue));
  };

  return (
    <>
      {showRollingDefaults && (
        <RollingDateDefaultShortcuts
          parameterType="date/range"
          value={value}
          onChange={onChange}
        />
      )}
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
    </>
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

function getPickerDefaultValue(): DateRangePickerValue {
  const today = dayjs().startOf("date").toDate();
  const past30Days = dayjs(today).subtract(30, "day").toDate();
  return { dateRange: [past30Days, today], hasTime: false };
}

function getWidgetValue({ dateRange, hasTime }: DateRangePickerValue) {
  return serializeDateParameterValue({
    type: "specific",
    operator: "between",
    values: dateRange,
    hasTime,
  });
}
