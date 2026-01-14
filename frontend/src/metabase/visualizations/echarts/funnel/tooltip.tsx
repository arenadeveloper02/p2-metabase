import type { TooltipOption } from "echarts/types/dist/shared";
import type React from "react";

import { formatChangeWithSign, formatValue } from "metabase/lib/formatting";
import { reactNodeToHtmlString } from "metabase/lib/react-to-html";
import { EChartsTooltip } from "metabase/visualizations/components/ChartTooltip/EChartsTooltip";
import { computeChange } from "metabase/visualizations/lib/numeric";
import type { ComputedVisualizationSettings } from "metabase/visualizations/types";
import type { DatasetColumn, RawSeries } from "metabase-types/api";

import { getTooltipBaseOption } from "../tooltip";

interface FunnelTooltipProps {
  dimensionName: string;
  dimensionValue: string;
  metricName: string;
  metricValue: number;
  metricCol: DatasetColumn;
  metricColSettings: Record<string, unknown>;
  previousValue?: number;
  initialValue: number;
}

const FunnelTooltipContent = ({
  dimensionName,
  dimensionValue,
  metricName,
  metricValue,
  metricCol,
  metricColSettings,
  previousValue,
  initialValue,
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

  const dimensionIndex = cols.findIndex(
    (col) => col.name === settings["funnel.dimension"],
  );
  const metricIndex = cols.findIndex(
    (col) => col.name === settings["funnel.metric"],
  );

  const dimensionCol = cols[dimensionIndex];
  const metricCol = cols[metricIndex];
  const { column: getColumnSettings } = settings;
  const metricColSettings = getColumnSettings
    ? getColumnSettings(metricCol)
    : {};

  // Create a map for quick lookup of previous values
  const valueMap = new Map(
    data.map((d, i) => [d.name, { value: d.value, index: i }]),
  );

  return {
    ...getTooltipBaseOption(containerRef),
    trigger: "item",
    formatter: (params: any) => {
      if (Array.isArray(params)) {
        return "";
      }

      const dataPoint = data.find((d) => d.name === params.name);
      if (!dataPoint) {
        return "";
      }

      const pointInfo = valueMap.get(params.name);
      const previousPoint =
        pointInfo && pointInfo.index > 0
          ? data[pointInfo.index - 1]
          : undefined;

      return reactNodeToHtmlString(
        <FunnelTooltipContent
          dimensionName={dimensionCol.display_name}
          dimensionValue={params.name}
          metricName={metricCol.display_name}
          metricValue={dataPoint.value}
          metricCol={metricCol}
          metricColSettings={metricColSettings}
          previousValue={previousPoint?.value}
          initialValue={data[0].value}
        />,
      );
    },
  };
};
