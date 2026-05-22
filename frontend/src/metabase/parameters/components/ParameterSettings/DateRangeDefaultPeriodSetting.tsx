import { useMemo } from "react";
import { t } from "ttag";

import {
  DATE_RANGE_DEFAULT_PERIOD_OPTIONS,
  getDateRangeDefaultPeriodId,
  getDefaultValueForDateRangePeriod,
  type DateRangeDefaultPeriodId,
} from "metabase/querying/parameters/date-range-presets";
import { Box, Select, Text } from "metabase/ui";
import type { Parameter } from "metabase-types/api";

type DateRangeDefaultPeriodSettingProps = {
  parameter: Parameter;
  onChangeDefaultValue: (value: unknown) => void;
};

export function DateRangeDefaultPeriodSetting({
  parameter,
  onChangeDefaultValue,
}: DateRangeDefaultPeriodSettingProps) {
  const selectedPeriodId = useMemo(
    () => getDateRangeDefaultPeriodId(parameter.default),
    [parameter.default],
  );

  const periodOptions = useMemo(
    () =>
      DATE_RANGE_DEFAULT_PERIOD_OPTIONS.map((option) => ({
        value: option.value,
        label: option.label,
      })),
    [],
  );

  const handlePeriodChange = (periodId: string | null) => {
    if (periodId == null) {
      return;
    }

    onChangeDefaultValue(
      getDefaultValueForDateRangePeriod(periodId as DateRangeDefaultPeriodId),
    );
  };

  return (
    <Box mb="xl">
      <Box component="label" mb="sm" fw="bold" display="block">
        {t`Default period`}
      </Box>
      <Select
        data={periodOptions}
        value={selectedPeriodId}
        aria-label={t`Default period`}
        onChange={handlePeriodChange}
      />
      <Text size="sm" c="text-secondary" mt="xs">
        {t`Rolling periods update automatically. Use Normal to set a fixed default below.`}
      </Text>
    </Box>
  );
}
