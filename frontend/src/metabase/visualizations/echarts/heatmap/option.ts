import type { EChartsOption } from "echarts";
import type { CallbackDataParams } from "echarts/types/dist/shared";
import type React from "react";

import { colors } from "metabase/ui/colors";
import { formatValue } from "metabase/value-formatting";
import type { ComputedVisualizationSettings } from "metabase/viz-core";
import type { RawSeries } from "metabase-types/api";

import {
  readSetting,
  settingBoolean,
  settingString,
} from "../../lib/read-setting";

import { getHeatmapTooltipOption } from "./tooltip";

export interface HeatmapDataPoint {
  value: [number, number, number | string];
}

export function getHeatmapChartOption(
  rawSeries: RawSeries,
  settings: ComputedVisualizationSettings,
  containerRef: React.RefObject<HTMLDivElement | null>,
): EChartsOption {
  const [
    {
      data: { cols, rows },
    },
  ] = rawSeries;

  const xDimensionName = settingString(
    readSetting(settings, "heatmap.xDimension"),
  );
  const yDimensionName = settingString(
    readSetting(settings, "heatmap.yDimension"),
  );
  const valueName = settingString(readSetting(settings, "heatmap.value"));

  const xIndex = cols.findIndex((col) => col.name === xDimensionName);
  const yIndex = cols.findIndex((col) => col.name === yDimensionName);
  const valueIndex = cols.findIndex((col) => col.name === valueName);

  // Get unique values for X and Y axes
  const xValues = Array.from(new Set(rows.map((row) => String(row[xIndex]))));
  const yValues = Array.from(new Set(rows.map((row) => String(row[yIndex]))));

  // Create a map for quick lookup
  const dataMap = new Map<string, number>();
  rows.forEach((row) => {
    const key = `${row[xIndex]}_${row[yIndex]}`;
    const value = Number(row[valueIndex]) || 0;
    dataMap.set(key, value);
  });

  // Transform data to ECharts format: [xIndex, yIndex, value]
  const data: Array<[number, number, number | string]> = [];
  yValues.forEach((yVal, yIdx) => {
    xValues.forEach((xVal, xIdx) => {
      const key = `${xVal}_${yVal}`;
      const value = dataMap.get(key);
      data.push([xIdx, yIdx, value !== undefined ? value : "-"]);
    });
  });

  // Calculate min and max for visual map
  const numericValues = Array.from(dataMap.values()).filter(
    (v) => typeof v === "number",
  );
  const minValue = Math.min(...numericValues, 0);
  const maxValue = Math.max(...numericValues, 10);

  const { column: getColumnSettings } = settings;
  const valueCol = cols[valueIndex];
  const valueColSettings =
    valueCol && getColumnSettings ? getColumnSettings(valueCol) : {};

  // Format value function (used for both tooltip and labels)
  const formatValueForDisplay = (value: number | string) => {
    if (value === "-" || value === null || value === undefined) {
      return "";
    }
    return String(
      formatValue(value, {
        column: valueCol,
        ...valueColSettings,
        compact: false,
      }),
    );
  };

  // Get display settings
  const showLabels =
    settingBoolean(readSetting(settings, "heatmap.showLabels")) !== false;
  const visualMapPosition =
    settingString(readSetting(settings, "heatmap.visualMapPosition")) === "top"
      ? "top"
      : "bottom";

  const option = {
    tooltip: getHeatmapTooltipOption(
      rawSeries,
      settings,
      containerRef,
      xValues,
      yValues,
    ),
    grid: {
      height: visualMapPosition === "bottom" ? "65%" : "75%",
      top: "10%",
      left: "10%",
      right: "10%",
    },
    xAxis: {
      type: "category" as const,
      data: xValues,
      splitArea: {
        show: true,
      },
      axisLabel: {
        rotate: xValues.length > 12 ? 45 : 0,
      },
    },
    yAxis: {
      type: "category" as const,
      data: yValues,
      splitArea: {
        show: true,
      },
    },
    visualMap: {
      min: minValue,
      max: maxValue,
      calculable: true,
      orient: "horizontal" as const,
      left: "center",
      bottom: visualMapPosition === "bottom" ? "5%" : undefined,
      top: visualMapPosition === "top" ? "5%" : undefined,
    },
    series: [
      {
        name: valueName || "Value",
        type: "heatmap" as const,
        data,
        label: {
          show: showLabels,
          formatter: (params: CallbackDataParams | CallbackDataParams[]) => {
            if (Array.isArray(params) || !Array.isArray(params.data)) {
              return "";
            }
            const cell = params.data[2];
            if (typeof cell !== "number" && typeof cell !== "string") {
              return "";
            }
            return formatValueForDisplay(cell);
          },
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: colors["shadow-default"],
          },
        },
      },
    ],
  };

  return option;
}
