import type { EChartsOption } from "echarts";

import { getColorsForValues } from "metabase/lib/colors/charts";
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

  // Apply colors to data points
  const coloredData: FunnelDataPoint[] = data.map(d => ({
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
      formatter: "{a} <br/>{b} : {c}",
    },
    legend: {
      data: data.map(d => d.name),
      bottom: 10,
    },
    series: [
      {
        name: settings["funnel.dimension"] || "Funnel",
        type: "funnel",
        left: "10%",
        top: 60,
        bottom: 60,
        width: "80%",
        min: 0,
        max: maxValue,
        minSize: "0%",
        maxSize: "100%",
        sort: "descending",
        gap: 2,
        label: {
          show: true,
          position: "inside",
        },
        labelLine: {
          length: 10,
          lineStyle: {
            width: 1,
            type: "solid",
          },
        },
        itemStyle: {
          borderColor: "#fff",
          borderWidth: 1,
        },
        emphasis: {
          label: {
            fontSize: 20,
          },
        },
        data: coloredData,
      },
    ],
  };
}
