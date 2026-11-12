import type {
  CallbackDataParams,
  TooltipOption,
} from "echarts/types/dist/shared";
import type React from "react";

import { reactNodeToHtmlString } from "metabase/utils/react-to-html";
import { formatValue } from "metabase/value-formatting";
import {
  type ComputedVisualizationSettings,
  EChartsTooltip,
  getTooltipBaseOption,
} from "metabase/viz-core";
import type { DatasetColumn, RawSeries } from "metabase-types/api";

import { readSetting, settingString } from "../../lib/read-setting";

interface HeatmapTooltipProps {
  xValue: string;
  yValue: string;
  value: number | string;
  valueCol?: DatasetColumn;
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
  containerRef: React.RefObject<HTMLDivElement | null>,
  xValues: string[],
  yValues: string[],
): TooltipOption => {
  const [
    {
      data: { cols },
    },
  ] = rawSeries;

  const valueName = settingString(readSetting(settings, "heatmap.value"));
  const valueIndex = cols.findIndex((col) => col.name === valueName);
  const valueCol = cols[valueIndex];

  const { column: getColumnSettings } = settings;
  const valueColSettings =
    valueCol && getColumnSettings ? getColumnSettings(valueCol) : {};

  return {
    ...getTooltipBaseOption(containerRef),
    trigger: "item",
    formatter: (params: CallbackDataParams | CallbackDataParams[]) => {
      if (Array.isArray(params) || !Array.isArray(params.data)) {
        return "";
      }

      const xIndex = params.data[0];
      const yIndex = params.data[1];
      const cell = params.data[2];
      if (typeof xIndex !== "number" || typeof yIndex !== "number") {
        return "";
      }
      if (typeof cell !== "number" && typeof cell !== "string") {
        return "";
      }

      const xVal = xValues[xIndex] ?? "";
      const yVal = yValues[yIndex] ?? "";
      const value = cell;

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
