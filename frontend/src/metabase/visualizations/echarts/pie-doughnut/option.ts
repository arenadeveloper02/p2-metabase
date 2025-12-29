import type { EChartsOption } from "echarts";

import type { ComputedVisualizationSettings } from "metabase/visualizations/types";
import type { RawSeries } from "metabase-types/api";

export interface DoughnutDataPoint {
  name: string;
  value: number;
  itemStyle?: {
    color: string;
  };
}

export function getDoughnutChartOption(
  rawSeries: RawSeries,
  settings: ComputedVisualizationSettings,
): EChartsOption {
  const [
    {
      data: { cols, rows },
    },
  ] = rawSeries;

  const pieRows = settings["pie.rows"] || [];

  // Get dimension and metric - handle both string and array formats
  const dimensionSetting = settings["pie.dimension"];
  const dimensionName = Array.isArray(dimensionSetting)
    ? dimensionSetting[0]
    : dimensionSetting;

  const metricSetting = settings["pie.metric"];
  const metricName = Array.isArray(metricSetting)
    ? metricSetting[0]
    : metricSetting;

  // Get dimension and metric indices
  const dimensionIndex = cols.findIndex(col => col.name === dimensionName);
  const metricIndex = cols.findIndex(col => col.name === metricName);

  // eslint-disable-next-line no-console
  console.log(
    "Dimension setting:",
    dimensionSetting,
    "→ name:",
    dimensionName,
    "→ index:",
    dimensionIndex,
  );
  // eslint-disable-next-line no-console
  console.log(
    "Metric setting:",
    metricSetting,
    "→ name:",
    metricName,
    "→ index:",
    metricIndex,
  );
  // eslint-disable-next-line no-console
  console.log(
    "Columns:",
    cols.map(c => c.name),
  );

  // Create a map of dimension values to metric values from raw data
  const dataMap = new Map<string, number>();
  rows.forEach(row => {
    const key = String(row[dimensionIndex]);
    const value = Number(row[metricIndex]) || 0;
    dataMap.set(key, value);
  });

  // Transform pie rows to ECharts format with actual values
  const data: DoughnutDataPoint[] = pieRows
    .filter((row: any) => row.enabled && !row.hidden)
    .map((row: any) => {
      const key = String(row.key);
      const value = dataMap.get(key) || 0;
      return {
        name: row.name || row.key,
        value,
        itemStyle: {
          color: row.color,
        },
      };
    });

  // eslint-disable-next-line no-console
  console.log("Doughnut chart data:", data);
  // eslint-disable-next-line no-console
  console.log("DataMap:", Array.from(dataMap.entries()));

  return {
    tooltip: {
      trigger: "item",
      formatter: "{b}: {c} ({d}%)",
    },
    legend: {
      top: "5%",
      left: "center",
      data: data.map(d => String(d.name)),
    },
    series: [
      {
        name: String(settings["pie.dimension"] || "Data"),
        type: "pie",
        radius: ["40%", "70%"],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: "#fff",
          borderWidth: 2,
        },
        label: {
          show: false,
          position: "center",
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 40,
            fontWeight: "bold",
          },
        },
        labelLine: {
          show: false,
        },
        data,
      },
    ],
  };
}
