import type { EChartsOption } from "echarts";
import type { CallbackDataParams } from "echarts/types/dist/shared";
import type React from "react";

import { colors as themeColors } from "metabase/ui/colors";
import { getColorsForValues } from "metabase/ui/colors/charts";
import { formatNullable } from "metabase/utils/formatting";
import { formatValue } from "metabase/value-formatting";
import type { ComputedVisualizationSettings } from "metabase/viz-core";
import type { RawSeries, SeriesOrderSetting } from "metabase-types/api";

import {
  isRecord,
  readSetting,
  settingBoolean,
  settingString,
} from "../../lib/read-setting";

import { getFunnelTooltipOption } from "./tooltip";

function funnelRowsFromSetting(
  value: unknown,
): SeriesOrderSetting[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  return value.flatMap((row) => {
    if (!isRecord(row) || typeof row.key !== "string") {
      return [];
    }
    return [
      {
        key: row.key,
        name: typeof row.name === "string" ? row.name : row.key,
        enabled: row.enabled !== false,
        color: typeof row.color === "string" ? row.color : undefined,
      },
    ];
  });
}

function paramName(
  params: CallbackDataParams | CallbackDataParams[],
): string | undefined {
  if (Array.isArray(params)) {
    return undefined;
  }
  return params.name;
}

export interface FunnelDataPoint {
  name: string;
  value: number;
  itemStyle?: {
    color: string;
  };
}

export function getFunnelChartOption(
  rawSeries: RawSeries,
  settings: ComputedVisualizationSettings,
  containerRef?: React.RefObject<HTMLDivElement>,
): EChartsOption {
  const [
    {
      data: { cols, rows },
    },
  ] = rawSeries;

  const dimensionIndex = cols.findIndex(
    (col) => col.name === settings["funnel.dimension"],
  );
  const metricIndex = cols.findIndex(
    (col) => col.name === settings["funnel.metric"],
  );

  // Respect saved funnel step order when it is present.
  const funnelRows = funnelRowsFromSetting(
    readSetting(settings, "funnel.rows"),
  );

  let data: FunnelDataPoint[];
  if (funnelRows) {
    data = funnelRows
      .filter((fr) => fr.enabled)
      .map((fr) => {
        const row = rows.find(
          (row) => formatNullable(row[dimensionIndex]) === fr.key,
        );
        if (row && row[dimensionIndex] != null && row[metricIndex] != null) {
          return {
            name: String(row[dimensionIndex]),
            value: Number(row[metricIndex]),
          };
        }
        return null;
      })
      .filter((d): d is FunnelDataPoint => d !== null);
  } else {
    data = rows
      .filter((row) => row[dimensionIndex] != null && row[metricIndex] != null)
      .map((row) => ({
        name: String(row[dimensionIndex]),
        value: Number(row[metricIndex]),
      }))
      // Default to sorting by value descending for proper pyramid shape
      .sort((a, b) => b.value - a.value);
  }

  const valuesBelowLabels =
    settingBoolean(readSetting(settings, "funnel.values_below_labels")) ===
    true;

  // Get colors from funnel.rows settings or generate default colors
  const dimensionValues = data.map((d) => d.name);
  const colorMapping: Record<string, string> = {};

  if (funnelRows) {
    for (const row of funnelRows) {
      if (row.color) {
        colorMapping[row.key] = row.color;
      }
    }
  }

  // Generate colors for all values, using saved colors when available
  const colors = getColorsForValues(dimensionValues, colorMapping);

  // Get metric column for formatting
  const metricCol = cols[metricIndex];

  // Create a formatter for metric values
  const formatMetricValue = (value: number): string => {
    const formatted = formatValue(value, {
      column: metricCol,
      ...(settings.column?.(metricCol) || {}),
    });
    // Ensure we always return a string
    if (typeof formatted === "string") {
      return formatted;
    }
    if (typeof formatted === "number") {
      return String(formatted);
    }
    return String(value);
  };

  // Apply colors to data points
  // We'll configure labels at series level to show both names (outside) and values (inside)
  const coloredData = data.map((d) => ({
    ...d,
    itemStyle: {
      color: colors[d.name],
    },
  }));

  // Calculate max value for proper scaling
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  // Get column display names for axis labels
  const dimensionCol = cols[dimensionIndex];
  const dimensionSetting = settingString(
    readSetting(settings, "funnel.dimension"),
  );
  const dimensionName = dimensionCol?.display_name || dimensionSetting || "";
  const seriesName = dimensionSetting || "Funnel";

  const tooltip = containerRef
    ? getFunnelTooltipOption(rawSeries, settings, containerRef, data)
    : {
        trigger: "item" as const,
        formatter: (params: CallbackDataParams | CallbackDataParams[]) => {
          const name = paramName(params);
          if (name == null) {
            return "";
          }
          const dataPoint = data.find((d) => d.name === name);
          if (!dataPoint) {
            return name;
          }
          return `${name}: ${formatMetricValue(dataPoint.value)}`;
        },
      };

  return {
    tooltip,
    title: [
      {
        text: dimensionName,
        left: "center",
        top: 5,
        textStyle: {
          fontSize: 14,
          fontWeight: "normal",
          color: themeColors["text-secondary"],
        },
      },
    ],
    legend: {
      data: data.map((d) => d.name),
      bottom: 10,
    },
    series: [
      {
        name: seriesName,
        type: "funnel",
        left: "center",
        top: 20,
        bottom: 50,
        width: "70%",
        min: 0,
        max: maxValue,
        minSize: "0%",
        maxSize: "100%",
        sort: "none",
        gap: 2,
        // Main label configuration: names outside
        label: {
          show: true,
          position: "outer",
          formatter: (params: CallbackDataParams | CallbackDataParams[]) => {
            const name = paramName(params) ?? "";
            if (valuesBelowLabels) {
              const dataPoint = data.find((d) => d.name === name);
              const formattedValue = dataPoint
                ? formatMetricValue(dataPoint.value)
                : "";
              return `{value|${formattedValue}}\n{name|${name}}`;
            }
            return name;
          },
          color: themeColors["text-primary"],
          fontSize: 12,
          rich: {
            name: {
              color: themeColors["text-secondary"],
              fontSize: 12,
              lineHeight: 16,
            },
            value: {
              color: themeColors["text-primary"],
              fontSize: 14,
              fontWeight: "bold",
              lineHeight: 20,
            },
          },
        },
        labelLine: {
          show: true,
          length: valuesBelowLabels ? 40 : 25,
          lineStyle: {
            width: 1,
            type: "solid",
            color: themeColors["text-secondary"],
          },
        },
        data: coloredData,
        itemStyle: {
          borderColor: themeColors["core-white"],
          borderWidth: 1,
        },
        emphasis: {
          label: {
            fontSize: 18,
            fontWeight: "bold",
          },
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: themeColors["shadow-default"],
          },
        },
      },
      {
        // Second series: invisible overlay to show values inside
        name: seriesName,
        type: "funnel",
        left: "center",
        top: 20,
        bottom: 50,
        width: "50%",
        min: 0,
        max: maxValue,
        minSize: "0%",
        maxSize: "100%",
        sort: "none",
        gap: 2,
        // Label configuration: values inside
        label: {
          show: !valuesBelowLabels,
          position: "inside",
          formatter: (params: CallbackDataParams | CallbackDataParams[]) => {
            const name = paramName(params);
            const dataPoint = data.find((d) => d.name === name);
            return dataPoint ? formatMetricValue(dataPoint.value) : "";
          },
          color: themeColors["core-white"],
          fontSize: 14,
          fontWeight: "bold",
        },
        labelLine: {
          show: false,
        },
        // Make this series invisible and silent - events pass through to the main series
        silent: true,
        data: coloredData.map((d) => ({
          ...d,
          itemStyle: {
            color: "transparent",
            borderColor: "transparent",
            borderWidth: 0,
          },
        })),
        // Emphasis configuration
        emphasis: {
          label: {
            fontSize: 14,
            fontWeight: "bold",
          },
        },
        // Ensure this series is on top
        z: 10,
      },
    ],
  };
}
