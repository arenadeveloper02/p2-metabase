import dayjs from "dayjs";
import { useState } from "react";
import { match } from "ts-pattern";
import { t } from "ttag";

import {
  SingleDatePicker,
  type SingleDatePickerValue,
} from "metabase/querying/filters/components/DatePicker/SpecificDatePicker/SingleDatePicker";
import type { RelativeDatePickerValue } from "metabase/querying/filters/types";
import {
  deserializeDateParameterValue,
  serializeDateParameterValue,
} from "metabase/querying/parameters/utils/parsing";
import { dateParameterValueToSingleDate } from "metabase/querying/parameters/utils/relative-date-to-range";
import { Button } from "metabase/ui";
import type { ParameterValueOrArray } from "metabase-types/api";

type DateSingleWidgetProps = {
  value: ParameterValueOrArray | null | undefined;
  submitButtonLabel?: string;
  onChange: (value: string) => void;
};

type WidgetState = {
  pickerValue: SingleDatePickerValue;
  relativeValue: RelativeDatePickerValue | null;
  isSpecific: boolean;
};

export function DateSingleWidget({
  value,
  submitButtonLabel = t`Apply`,
  onChange,
}: DateSingleWidgetProps) {
  const [state, setState] = useState(() => getInitialState(value));

  const handlePickerChange = (pickerValue: SingleDatePickerValue) => {
    setState({
      pickerValue,
      relativeValue: null,
      isSpecific: true,
    });
  };

  const handleSubmit = () => {
    if (!state.isSpecific && state.relativeValue != null) {
      onChange(serializeDateParameterValue(state.relativeValue));
    } else {
      onChange(getSpecificWidgetValue(state.pickerValue));
    }
  };

  return (
    <SingleDatePicker
      value={state.pickerValue}
      hasTimeToggle
      renderSubmitButton={() => (
        <Button type="submit" variant="filled">
          {submitButtonLabel}
        </Button>
      )}
      onChange={handlePickerChange}
      onSubmit={handleSubmit}
    />
  );
}

function getInitialState(
  value: ParameterValueOrArray | null | undefined,
): WidgetState {
  const filter = deserializeDateParameterValue(value);

  if (filter?.type === "relative") {
    const date = dateParameterValueToSingleDate(value);
    if (date != null) {
      return {
        pickerValue: { date, hasTime: false },
        relativeValue: filter,
        isSpecific: false,
      };
    }
  }

  if (filter?.type === "specific" && filter.operator === "=") {
    return {
      pickerValue: {
        date: filter.values[0],
        hasTime: filter.hasTime,
      },
      relativeValue: null,
      isSpecific: true,
    };
  }

  return {
    pickerValue: getPickerDefaultValue(),
    relativeValue: null,
    isSpecific: true,
  };
}

function getPickerDefaultValue(): SingleDatePickerValue {
  const today = dayjs().startOf("date").toDate();
  return { date: today, hasTime: false };
}

function getSpecificWidgetValue({ date, hasTime }: SingleDatePickerValue) {
  return serializeDateParameterValue({
    type: "specific",
    operator: "=",
    values: [date],
    hasTime,
  });
}
