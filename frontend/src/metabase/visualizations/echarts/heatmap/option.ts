import type { EChartsOption } from "echarts";
import type React from "react";

import { alpha } from "metabase/lib/colors";
import { formatValue } from "metabase/lib/formatting";
import type { ComputedVisualizationSettings } from "metabase/visualizations/types";
import type { RawSeries } from "metabase-types/api";

import { getHeatmapTooltipOption } from "./tooltip";

export interface HeatmapDataPoint {
  value: [number, number, number | string];
}

export function getHeatmapChartOption(
  rawSeries: RawSeries,
  settings: ComputedVisualizationSettings,
  containerRef: React.RefObject<HTMLDivElement>,
): EChartsOption {
  const [
    {
      data: { cols, rows },
    },
  ] = rawSeries;

  // eslint-disable-next-line no-console
  console.log("🔥 HEATMAP DEBUG - Raw Data:", { cols, rows });

  // eslint-disable-next-line no-console
  console.log("🔥 HEATMAP DEBUG - Column Names:", {
    columnNames: cols.map((col: any) => col.name),
    columnDetails: cols.map((col: any) => ({
      name: col.name,
      display_name: col.display_name,
      source: col.source,
      base_type: col.base_type,
    })),
  });

  // eslint-disable-next-line no-console
  console.log("🔥 HEATMAP DEBUG - First 5 Rows:", rows.slice(0, 5));

  // Get the three dimensions: X-axis, Y-axis, and Value
  const xDimensionSetting = settings["heatmap.xDimension"];
  const yDimensionSetting = settings["heatmap.yDimension"];
  const valueSetting = settings["heatmap.value"];

  // eslint-disable-next-line no-console
  console.log("🔥 HEATMAP DEBUG - Settings:", {
    xDimensionSetting,
    yDimensionSetting,
    valueSetting,
  });

  const xDimensionName = Array.isArray(xDimensionSetting)
    ? xDimensionSetting[0]
    : xDimensionSetting;
  const yDimensionName = Array.isArray(yDimensionSetting)
    ? yDimensionSetting[0]
    : yDimensionSetting;
  const valueName = Array.isArray(valueSetting)
    ? valueSetting[0]
    : valueSetting;

  // eslint-disable-next-line no-console
  console.log("🔥 HEATMAP DEBUG - Dimension Names:", {
    xDimensionName,
    yDimensionName,
    valueName,
  });

  // Find column indices
  const xIndex = cols.findIndex(col => col.name === xDimensionName);
  const yIndex = cols.findIndex(col => col.name === yDimensionName);
  const valueIndex = cols.findIndex(col => col.name === valueName);

  // eslint-disable-next-line no-console
  console.log("🔥 HEATMAP DEBUG - Column Indices:", {
    xIndex,
    yIndex,
    valueIndex,
  });

  // Get unique values for X and Y axes
  const xValues = Array.from(new Set(rows.map(row => String(row[xIndex]))));
  const yValues = Array.from(new Set(rows.map(row => String(row[yIndex]))));

  // eslint-disable-next-line no-console
  console.log("🔥 HEATMAP DEBUG - Unique Values:", {
    xValues,
    yValues,
    xCount: xValues.length,
    yCount: yValues.length,
  });

  // Create a map for quick lookup
  const dataMap = new Map<string, number>();
  rows.forEach(row => {
    const key = `${row[xIndex]}_${row[yIndex]}`;
    const value = Number(row[valueIndex]) || 0;
    dataMap.set(key, value);
  });

  // eslint-disable-next-line no-console
  console.log("🔥 HEATMAP DEBUG - Data Map:", {
    mapSize: dataMap.size,
    sampleEntries: Array.from(dataMap.entries()).slice(0, 5),
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

  // eslint-disable-next-line no-console
  console.log("🔥 HEATMAP DEBUG - Transformed Data:", {
    dataLength: data.length,
    sampleData: data.slice(0, 10),
  });

  // Calculate min and max for visual map
  const numericValues = Array.from(dataMap.values()).filter(
    v => typeof v === "number",
  );
  const minValue = Math.min(...numericValues, 0);
  const maxValue = Math.max(...numericValues, 10);

  // eslint-disable-next-line no-console
  console.log("🔥 HEATMAP DEBUG - Value Range:", {
    minValue,
    maxValue,
    numericValuesCount: numericValues.length,
  });

  // Get column settings for formatting
  const { column: getColumnSettings } = settings;
  const valueCol = cols[valueIndex];
  const valueColSettings = getColumnSettings ? getColumnSettings(valueCol) : {};

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
  const showLabels = settings["heatmap.showLabels"] !== false;
  const visualMapPosition = settings["heatmap.visualMapPosition"] || "bottom";

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
          formatter: (params: any) => {
            const value = params.data[2];
            return formatValueForDisplay(value);
          },
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: alpha("text-dark", 0.5),
          },
        },
      },
    ],
  };

  // eslint-disable-next-line no-console
  console.log("🔥 HEATMAP DEBUG - Final ECharts Option:", option);

  return option;
}
