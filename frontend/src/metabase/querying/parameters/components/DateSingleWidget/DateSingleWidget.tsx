import { useState } from "react";
import { match } from "ts-pattern";
import { t } from "ttag";

import { dayjs } from "metabase/dayjs";
import {
  SingleDatePicker,
  type SingleDatePickerValue,
} from "metabase/querying/common/components/DatePicker/SpecificDatePicker/SingleDatePicker";
import type { DatePickerOperator } from "metabase/querying/common/types";
import { RollingDateDefaultShortcuts } from "metabase/querying/parameters/components/RollingDateDefaultShortcuts";
import {
  deserializeDateParameterValue,
  serializeDateParameterValue,
} from "metabase/querying/parameters/utils/parsing";
import { Button } from "metabase/ui";
import type { ParameterValueOrArray } from "metabase-types/api";

type DateSingleWidgetProps = {
  value: ParameterValueOrArray | null | undefined;
  submitButtonLabel?: string;
  showRollingDefaults?: boolean;
  availableOperators?: DatePickerOperator[];
  onChange: (value: string) => void;
};

export function DateSingleWidget({
  value,
  submitButtonLabel = t`Apply`,
  showRollingDefaults = false,
  onChange,
}: DateSingleWidgetProps) {
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
          parameterType="date/single"
          value={value}
          onChange={onChange}
        />
      )}
      <SingleDatePicker
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
): SingleDatePickerValue | undefined {
  return match(deserializeDateParameterValue(value))
    .returnType<SingleDatePickerValue | undefined>()
    .with({ type: "specific", operator: "=" }, ({ values, hasTime }) => ({
      date: values[0],
      hasTime,
    }))
    .otherwise(() => undefined);
}

function getPickerDefaultValue(): SingleDatePickerValue {
  const today = dayjs().startOf("date").toDate();
  return { date: today, hasTime: false };
}

function getWidgetValue({ date, hasTime }: SingleDatePickerValue) {
  return serializeDateParameterValue({
    type: "specific",
    operator: "=",
    values: [date],
    hasTime: hasTime,
  });
}
