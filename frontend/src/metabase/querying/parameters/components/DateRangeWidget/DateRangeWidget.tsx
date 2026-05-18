import { useCallback, useMemo, useState } from "react";
import { t } from "ttag";

import {
  DateRangePicker,
  type DateRangePickerValue,
} from "metabase/querying/filters/components/DatePicker/SpecificDatePicker/DateRangePicker";
import type { RelativeDatePickerValue } from "metabase/querying/filters/types";
import {
  DATE_RANGE_RELATIVE_PRESETS,
  DEFAULT_DATE_RANGE_RELATIVE_VALUE,
  findDateRangePresetByValue,
} from "metabase/querying/parameters/date-range-presets";
import {
  deserializeDateParameterValue,
  serializeDateParameterValue,
} from "metabase/querying/parameters/utils/parsing";
import { dateParameterValueToRange } from "metabase/querying/parameters/utils/relative-date-to-range";
import { Box, Button, Select } from "metabase/ui";
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

  const selectedPresetId = useMemo(() => {
    if (state.isSpecific || state.relativeValue == null) {
      return null;
    }
    return findDateRangePresetByValue(state.relativeValue)?.id ?? null;
  }, [state.isSpecific, state.relativeValue]);

  const presetOptions = useMemo(
    () =>
      DATE_RANGE_RELATIVE_PRESETS.map((preset) => ({
        value: preset.id,
        label: preset.label,
      })),
    [],
  );

  const handlePickerChange = useCallback((pickerValue: DateRangePickerValue) => {
    setState((prev) => ({
      ...prev,
      pickerValue,
      relativeValue: null,
      isSpecific: true,
    }));
  }, []);

  const handlePresetChange = useCallback((presetId: string | null) => {
    if (presetId == null) {
      return;
    }

    const preset = DATE_RANGE_RELATIVE_PRESETS.find((p) => p.id === presetId);
    if (preset == null) {
      return;
    }

    const range = dateParameterValueToRange(
      serializeDateParameterValue(preset.value),
    );
    if (range == null) {
      return;
    }

    setState({
      pickerValue: {
        dateRange: [range.start, range.end],
        hasTime: false,
      },
      relativeValue: preset.value,
      isSpecific: false,
    });
  }, []);

  const handleSubmit = () => {
    if (!state.isSpecific && state.relativeValue != null) {
      onChange(serializeDateParameterValue(state.relativeValue));
    } else {
      onChange(getSpecificWidgetValue(state.pickerValue));
    }
  };

  return (
    <DateRangePicker
      value={state.pickerValue}
      hasTimeToggle
      renderHeader={() => (
        <Box mb="md">
          <Select
            data={presetOptions}
            value={selectedPresetId}
            placeholder={t`Select a period`}
            aria-label={t`Period`}
            onChange={handlePresetChange}
          />
        </Box>
      )}
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

  return getDefaultState();
}

function getDefaultState(): WidgetState {
  const range = dateParameterValueToRange(
    serializeDateParameterValue(DEFAULT_DATE_RANGE_RELATIVE_VALUE),
  );

  return {
    pickerValue: {
      dateRange: range
        ? [range.start, range.end]
        : getPickerFallbackRange(),
      hasTime: false,
    },
    relativeValue: DEFAULT_DATE_RANGE_RELATIVE_VALUE,
    isSpecific: false,
  };
}

function getPickerFallbackRange(): [Date, Date] {
  const today = new Date();
  const past30Days = new Date(today);
  past30Days.setDate(past30Days.getDate() - 30);
  return [past30Days, today];
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
