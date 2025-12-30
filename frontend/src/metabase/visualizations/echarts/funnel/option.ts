import type { EChartsOption } from "echarts";

import { getColorsForValues } from "metabase/lib/colors/charts";
import { formatValue } from "metabase/lib/formatting";
import type { ComputedVisualizationSettings } from "metabase/visualizations/types";
import type { RawSeries } from "metabase-types/api";

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
): EChartsOption {
  const [
    {
      data: { cols, rows },
    },
  ] = rawSeries;

  const dimensionIndex = cols.findIndex(
    col => col.name === settings["funnel.dimension"],
  );
  const metricIndex = cols.findIndex(
    col => col.name === settings["funnel.metric"],
  );

  // Transform data for ECharts funnel - filter out null/empty values
  const data: FunnelDataPoint[] = rows
    .filter(row => row[dimensionIndex] != null && row[metricIndex] != null)
    .map(row => ({
      name: String(row[dimensionIndex]),
      value: Number(row[metricIndex]),
    }))
    // Sort by value descending for proper pyramid shape
    .sort((a, b) => b.value - a.value);

  // Get colors from funnel.rows settings or generate default colors
  const dimensionValues = data.map(d => d.name);
  let colorMapping: Record<string, string> = {};

  if (settings["funnel.rows"]) {
    // Use colors from funnel.rows if available
    const funnelRows = settings["funnel.rows"] as any[];
    colorMapping = funnelRows.reduce(
      (acc, row) => {
        if (row.color) {
          acc[row.key] = row.color;
        }
        return acc;
      },
      {} as Record<string, string>,
    );
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
  const coloredData = data.map(d => ({
    ...d,
    itemStyle: {
      color: colors[d.name],
    },
  }));

  // Calculate max value for proper scaling
  const maxValue = Math.max(...data.map(d => d.value), 1);

  return {
    tooltip: {
      trigger: "item",
      formatter: (params: any) => {
        const dataPoint = data.find(d => d.name === params.name);
        if (!dataPoint) {
          return `${params.name}: ${params.value}`;
        }

        // Format metric value using the same formatter as labels
        const formattedValue = formatMetricValue(dataPoint.value);

        // Show only category name and formatted value
        return `${params.name}: ${formattedValue}`;
      },
    },
    legend: {
      data: data.map(d => d.name),
      bottom: 10,
    },
    series: [
      {
        name: settings["funnel.dimension"] || "Funnel",
        type: "funnel",
        left: "center",
        top: 20,
        bottom: 50,
        width: "85%",
        min: 0,
        max: maxValue,
        minSize: "0%",
        maxSize: "100%",
        sort: "descending",
        gap: 2,
        // Main label configuration: names outside
        label: {
          show: true,
          position: "outer",
          formatter: "{b}",
          color: "#333",
        },
        labelLine: {
          show: true,
          length: 20,
          lineStyle: {
            width: 1,
            type: "solid",
            color: "#999",
          },
        },
        data: coloredData,
        itemStyle: {
          borderColor: "#fff",
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
        width: "65%",
        min: 0,
        max: maxValue,
        minSize: "0%",
        maxSize: "100%",
        sort: "descending",
        gap: 2,
        // Label configuration: values inside
        label: {
          show: true,
          position: "inside",
          formatter: (params: any) => {
            const dataPoint = data.find(d => d.name === params.name);
            return dataPoint ? formatMetricValue(dataPoint.value) : "";
          },
          color: "#fff",
          fontSize: 14,
          fontWeight: "bold",
        },
        labelLine: {
          show: false,
        },
        // Make this series invisible - only labels are visible
        data: coloredData.map(d => ({
          ...d,
          itemStyle: {
            color: "transparent",
            borderColor: "transparent",
            borderWidth: 0,
          },
        })),
        // Emphasis configuration for scaling labels on hover
        emphasis: {
          label: {
            fontSize: 18,
            fontWeight: "bold",
          },
        },
        // Ensure this series is on top
        z: 10,
      },
    ],
  };
}
