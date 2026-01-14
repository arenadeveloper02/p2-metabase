import type { TooltipOption } from "echarts/types/dist/shared";
import type React from "react";

import { reactNodeToHtmlString } from "metabase/lib/react-to-html";
import { formatValue } from "metabase/lib/formatting";
import { EChartsTooltip } from "metabase/visualizations/components/ChartTooltip/EChartsTooltip";
import { getTooltipBaseOption } from "../tooltip";

import type { ComputedVisualizationSettings } from "metabase/visualizations/types";
import type { RawSeries } from "metabase-types/api";

interface HeatmapTooltipProps {
  xValue: string;
  yValue: string;
  value: number | string;
  valueCol: any;
  valueColSettings: Record<string, unknown>;
}

const HeatmapTooltipContent = ({
  xValue,
  yValue,
  value,
  valueCol,
  valueColSettings,
}: HeatmapTooltipProps) => {
  const formatValueForDisplay = (val: number | string) => {
    if (val === "-" || val === null || val === undefined) {
      return "No data";
    }
    return String(
      formatValue(val, {
        column: valueCol,
        ...valueColSettings,
        compact: false,
      }),
    );
  };

  const header = `${yValue} - ${xValue}`;
  const formattedValue = formatValueForDisplay(value);

  return (
    <EChartsTooltip
      header={header}
      rows={[
        {
          name: "",
          values: [formattedValue],
        },
      ]}
    />
  );
};

export const getHeatmapTooltipOption = (
  rawSeries: RawSeries,
  settings: ComputedVisualizationSettings,
  containerRef: React.RefObject<HTMLDivElement>,
  xValues: string[],
  yValues: string[],
): TooltipOption => {
  const [
    {
      data: { cols },
    },
  ] = rawSeries;

  const valueSetting = settings["heatmap.value"];
  const valueName = Array.isArray(valueSetting)
    ? valueSetting[0]
    : valueSetting;

  const valueIndex = cols.findIndex((col: any) => col.name === valueName);
  const valueCol = cols[valueIndex];

  const { column: getColumnSettings } = settings;
  const valueColSettings = getColumnSettings ? getColumnSettings(valueCol) : {};

  return {
    ...getTooltipBaseOption(containerRef),
    trigger: "item",
    formatter: (params: any) => {
      if (Array.isArray(params)) {
        return "";
      }

      const xVal = xValues[params.data[0]];
      const yVal = yValues[params.data[1]];
      const value = params.data[2];

      return reactNodeToHtmlString(
        <HeatmapTooltipContent
          xValue={xVal}
          yValue={yVal}
          value={value}
          valueCol={valueCol}
          valueColSettings={valueColSettings}
        />,
      );
    },
  };
};

