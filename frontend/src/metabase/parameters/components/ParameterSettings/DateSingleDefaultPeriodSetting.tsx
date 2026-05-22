import { useMemo } from "react";
import { t } from "ttag";

import {
  DATE_SINGLE_DEFAULT_PERIOD_OPTIONS,
  getDateSingleDefaultPeriodId,
  getDefaultValueForDateSinglePeriod,
  type DateSingleDefaultPeriodId,
} from "metabase/querying/parameters/date-single-presets";
import { Box, Select, Text } from "metabase/ui";
import type { Parameter } from "metabase-types/api";

type DateSingleDefaultPeriodSettingProps = {
  parameter: Parameter;
  onChangeDefaultValue: (value: unknown) => void;
};

export function DateSingleDefaultPeriodSetting({
  parameter,
  onChangeDefaultValue,
}: DateSingleDefaultPeriodSettingProps) {
  const selectedPeriodId = useMemo(
    () => getDateSingleDefaultPeriodId(parameter.default),
    [parameter.default],
  );

  const periodOptions = useMemo(
    () =>
      DATE_SINGLE_DEFAULT_PERIOD_OPTIONS.map((option) => ({
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
      getDefaultValueForDateSinglePeriod(periodId as DateSingleDefaultPeriodId),
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
