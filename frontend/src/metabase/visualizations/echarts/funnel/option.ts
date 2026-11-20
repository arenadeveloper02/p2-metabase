import type { EChartsOption } from "echarts";
import type React from "react";

import { getColorsForValues } from "metabase/ui/colors/charts";
import { formatNullable } from "metabase/utils/formatting";
import { formatValue } from "metabase/value-formatting";
import type {
  ComputedVisualizationSettings,
  RenderingContext,
} from "metabase/visualizations/types";
import { funnelStepDisplayName } from "metabase/visualizations/visualizations/Funnel/step-name";
import type { RawSeries } from "metabase-types/api";

import { getFunnelTooltipOption } from "./tooltip";

export interface FunnelDataPoint {
  name: string;
  value: number;
  stepKey: string;
  itemStyle?: {
    color: string;
  };
}

export function getFunnelChartOption(
  rawSeries: RawSeries,
  settings: ComputedVisualizationSettings,
  containerRef: React.RefObject<HTMLDivElement | null> | undefined,
  renderingContext: Pick<RenderingContext, "getColor" | "fontFamily">,
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

  // Transform data for ECharts funnel
  // Respect settings["funnel.rows"] for filtering and ordering if present
  const funnelRows = settings["funnel.rows"] as any[];

  const toDataPoint = (
    row: (typeof rows)[number],
    stepKey: string,
  ): FunnelDataPoint => ({
    name: funnelStepDisplayName(
      funnelRows,
      stepKey,
      String(row[dimensionIndex]),
    ),
    value: Number(row[metricIndex]),
    stepKey,
  });

  let data: FunnelDataPoint[];
  if (funnelRows) {
    data = funnelRows
      .filter((fr) => fr.enabled)
      .map((fr) => {
        const row = rows.find(
          (row) => formatNullable(row[dimensionIndex]) === fr.key,
        );
        if (row && row[dimensionIndex] != null && row[metricIndex] != null) {
          return toDataPoint(row, fr.key);
        }
        return null;
      })
      .filter((d): d is FunnelDataPoint => d !== null);
  } else {
    data = rows
      .filter((row) => row[dimensionIndex] != null && row[metricIndex] != null)
      .map((row) =>
        toDataPoint(row, String(formatNullable(row[dimensionIndex]))),
      )
      // Default to sorting by value descending for proper pyramid shape
      .sort((a, b) => b.value - a.value);
  }

  const valuesBelowLabels = settings["funnel.values_below_labels"];

  // Colors stay keyed by the step key so a renamed label keeps its color.
  const stepKeys = data.map((d) => d.stepKey);
  let colorMapping: Record<string, string> = {};

  if (funnelRows) {
    // Use colors from funnel.rows if available
    colorMapping = funnelRows.reduce<Record<string, string>>((acc, row) => {
      if (row.color) {
        acc[row.key] = row.color;
      }
      return acc;
    }, {});
  }

  const colors = getColorsForValues(stepKeys, colorMapping);

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
      color: colors[d.stepKey],
    },
  }));

  // Calculate max value for proper scaling
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  // Get column display names for axis labels
  const dimensionCol = cols[dimensionIndex];
  const dimensionName =
    dimensionCol?.display_name || settings["funnel.dimension"] || "";
  // Same theme tokens as bar-chart series labels and the legend.
  const textPrimary = renderingContext.getColor("text-primary");
  const textSecondary = renderingContext.getColor("text-secondary");
  const { fontFamily } = renderingContext;

  const tooltip = containerRef
    ? getFunnelTooltipOption(rawSeries, settings, containerRef, data)
    : {
        trigger: "item" as const,
        formatter: (params: { name?: string; value?: unknown }) => {
          const dataPoint = data.find((d) => d.name === params.name);
          if (!dataPoint) {
            return `${params.name}: ${params.value}`;
          }
          const formattedValue = formatMetricValue(dataPoint.value);
          return `${params.name}: ${formattedValue}`;
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
          fontFamily,
          color: textPrimary,
        },
      },
    ],
    legend: {
      data: data.map((d) => d.name),
      bottom: 10,
      textStyle: {
        color: textPrimary,
        fontFamily,
      },
    },
    series: [
      {
        name: settings["funnel.dimension"] || "Funnel",
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
          formatter: (params: any) => {
            if (valuesBelowLabels) {
              const dataPoint = data.find((d) => d.name === params.name);
              const formattedValue = dataPoint
                ? formatMetricValue(dataPoint.value)
                : "";
              return `{value|${formattedValue}}\n{name|${params.name}}`;
            }
            return params.name;
          },
          color: textPrimary,
          fontFamily,
          fontSize: 12,
          rich: {
            name: {
              color: textPrimary,
              fontFamily,
              fontSize: 12,
              lineHeight: 16,
            },
            value: {
              color: textPrimary,
              fontFamily,
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
            color: textSecondary,
          },
        },
        data: coloredData,
        itemStyle: {
          borderColor: renderingContext.getColor("text-white"),
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
            // eslint-disable-next-line metabase/no-color-literals -- echarts shadow, not a theme fill
            shadowColor: "rgba(0, 0, 0, 0.5)",
          },
        },
      },
      {
        // Second series: invisible overlay to show values inside
        name: settings["funnel.dimension"] || "Funnel",
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
          formatter: (params: any) => {
            const dataPoint = data.find((d) => d.name === params.name);
            return dataPoint ? formatMetricValue(dataPoint.value) : "";
          },
          color: renderingContext.getColor("text-white"),
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
