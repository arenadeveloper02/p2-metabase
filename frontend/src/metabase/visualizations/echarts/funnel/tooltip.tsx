import type {
  CallbackDataParams,
  TooltipOption,
} from "echarts/types/dist/shared";
import type React from "react";

import { formatChangeWithSign } from "metabase/utils/formatting";
import { reactNodeToHtmlString } from "metabase/utils/react-to-html";
import { formatValue } from "metabase/value-formatting";
import {
  type ComputedVisualizationSettings,
  EChartsTooltip,
  computeChange,
  getTooltipBaseOption,
} from "metabase/viz-core";
import type { DatasetColumn, RawSeries } from "metabase-types/api";

import { readSetting, settingString } from "../../lib/read-setting";

interface FunnelTooltipProps {
  dimensionValue: string;
  metricName: string;
  metricValue: number;
  metricCol: DatasetColumn;
  metricColSettings: Record<string, unknown>;
  previousValue?: number;
}

const FunnelTooltipContent = ({
  dimensionValue,
  metricName,
  metricValue,
  metricCol,
  metricColSettings,
  previousValue,
}: FunnelTooltipProps) => {
  const formatMetricValue = (value: number): string => {
    const formatted = formatValue(value, {
      column: metricCol,
      ...metricColSettings,
    });
    if (typeof formatted === "string") {
      return formatted;
    }
    if (typeof formatted === "number") {
      return String(formatted);
    }
    return String(value);
  };

  const formattedValue = formatMetricValue(metricValue);

  const rows = [
    {
      name: metricName,
      values: [formattedValue],
    },
  ];

  const footer =
    previousValue != null
      ? {
          name: "Compared to previous",
          values: [
            formatChangeWithSign(computeChange(previousValue, metricValue)),
          ],
        }
      : undefined;

  return <EChartsTooltip header={dimensionValue} rows={rows} footer={footer} />;
};

export const getFunnelTooltipOption = (
  rawSeries: RawSeries,
  settings: ComputedVisualizationSettings,
  containerRef: React.RefObject<HTMLDivElement>,
  data: Array<{ name: string; value: number }>,
): TooltipOption => {
  const [
    {
      data: { cols },
    },
  ] = rawSeries;

  const metricName = settingString(readSetting(settings, "funnel.metric"));
  const metricIndex = cols.findIndex((col) => col.name === metricName);

  const metricCol = cols[metricIndex];
  const { column: getColumnSettings } = settings;
  const metricColSettings =
    metricCol && getColumnSettings ? getColumnSettings(metricCol) : {};

  // Create a map for quick lookup of previous values
  const valueMap = new Map(
    data.map((d, i) => [d.name, { value: d.value, index: i }]),
  );

  return {
    ...getTooltipBaseOption(
      // React 19 RefObject is invariant, and this helper allows a null current.
      containerRef as React.RefObject<HTMLDivElement | null>,
    ),
    trigger: "item",
    formatter: (params: CallbackDataParams | CallbackDataParams[]) => {
      if (Array.isArray(params)) {
        return "";
      }

      const dataPoint = data.find((d) => d.name === params.name);
      if (!dataPoint || metricCol == null) {
        return "";
      }

      const pointInfo = valueMap.get(params.name);
      const previousPoint =
        pointInfo && pointInfo.index > 0
          ? data[pointInfo.index - 1]
          : undefined;

      return reactNodeToHtmlString(
        <FunnelTooltipContent
          dimensionValue={params.name}
          metricName={metricCol.display_name}
          metricValue={dataPoint.value}
          metricCol={metricCol}
          metricColSettings={metricColSettings}
          previousValue={previousPoint?.value}
        />,
      );
    },
  };
};
