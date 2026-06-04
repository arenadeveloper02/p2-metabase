import dayjs from "dayjs";
import { useState } from "react";
import { match } from "ts-pattern";
import { t } from "ttag";

import {
  DateRangePicker,
  type DateRangePickerValue,
} from "metabase/querying/filters/components/DatePicker/SpecificDatePicker/DateRangePicker";
import type { RelativeDatePickerValue } from "metabase/querying/filters/types";
import {
  deserializeDateParameterValue,
  serializeDateParameterValue,
} from "metabase/querying/parameters/utils/parsing";
import {
  dateParameterValueToRange,
  resolveDateRangeParameterValueToString,
} from "metabase/querying/parameters/utils/relative-date-to-range";
import { Button } from "metabase/ui";
import type { ParameterValueOrArray } from "metabase-types/api";

type DateRangeWidgetProps = {
  value: ParameterValueOrArray | null | undefined;
  submitButtonLabel?: string;
  onChange: (value: string) => void;
};

type WidgetState = {
  pickerValue: DateRangePickerValue;
  relativeValue: RelativeDatePickerValue | null;
  isSpecific: boolean;
};

export function DateRangeWidget({
  value,
  submitButtonLabel = t`Apply`,
  onChange,
}: DateRangeWidgetProps) {
  const [state, setState] = useState(() => getInitialState(value));

  const handlePickerChange = (pickerValue: DateRangePickerValue) => {
    setState({
      pickerValue,
      relativeValue: null,
      isSpecific: true,
    });
  };

  const handleSubmit = () => {
    if (!state.isSpecific && state.relativeValue != null) {
      const resolved = resolveDateRangeParameterValueToString(
        serializeDateParameterValue(state.relativeValue),
      );
      onChange(resolved ?? getSpecificWidgetValue(state.pickerValue));
    } else {
      onChange(getSpecificWidgetValue(state.pickerValue));
    }
  };

  return (
    <DateRangePicker
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
    const range = dateParameterValueToRange(value);
    if (range != null) {
      return {
        pickerValue: {
          dateRange: [range.start, range.end],
          hasTime: false,
        },
        relativeValue: filter,
        isSpecific: false,
      };
    }
  }

  if (filter?.type === "specific" && filter.operator === "between") {
    return {
      pickerValue: {
        dateRange: [filter.values[0], filter.values[1]],
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

function getPickerDefaultValue(): DateRangePickerValue {
  const today = dayjs().startOf("date").toDate();
  const past30Days = dayjs(today).subtract(30, "day").toDate();
  return { dateRange: [past30Days, today], hasTime: false };
}

function getSpecificWidgetValue({
  dateRange,
  hasTime,
}: DateRangePickerValue): string {
  return serializeDateParameterValue({
    type: "specific",
    operator: "between",
    values: dateRange,
    hasTime,
  });
}
