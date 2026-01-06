import type { EChartsOption } from "echarts";

import { formatValue } from "metabase/lib/formatting";
import { computeMaxDecimalsForValues } from "metabase/visualizations/lib/utils";
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
  const metricCol = cols[metricIndex];

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

  // Calculate total and percentages
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const percentages = data.map(d => (total > 0 ? d.value / total : 0));

  // Get column settings for formatting
  const { column: getColumnSettings } = settings;
  const metricColSettings = getColumnSettings
    ? getColumnSettings(metricCol)
    : {};

  // Format metric values
  const formatMetric = (value: number) =>
    String(
      formatValue(value, {
        ...metricColSettings,
        compact: false,
      }),
    );

  // Format percentages
  const formatPercent = (value: number, location: "legend" | "chart") => {
    let decimals = settings["pie.decimal_places"];
    if (decimals == null) {
      decimals = computeMaxDecimalsForValues(percentages, {
        style: "percent",
        maximumSignificantDigits: location === "legend" ? 3 : 2,
      });
    }

    return String(
      formatValue(value, {
        column: metricCol,
        number_separators: metricColSettings.number_separators as string,
        number_style: "percent",
        decimals,
      }),
    );
  };

  // Get display settings
  const showLegend = settings["pie.show_legend"] !== false;
  const showLabels = settings["pie.show_labels"];
  const showTotal = settings["pie.show_total"];
  const percentVisibility = settings["pie.percent_visibility"];

  // Determine if percentages should be shown on the chart
  const showPercentOnChart =
    percentVisibility === "inside" || percentVisibility === "both";

  // Determine if percentages should be shown in the legend
  const showPercentInLegend =
    percentVisibility === "legend" || percentVisibility === "both";

  // Build label formatter
  const getLabelText = (dataIndex: number) => {
    const slice = data[dataIndex];
    const percentage = percentages[dataIndex];

    const name = showLabels ? slice.name : undefined;
    const percent = showPercentOnChart
      ? formatPercent(percentage, "chart")
      : undefined;

    if (name != null && percent != null) {
      return `${name}: ${percent}`;
    }
    if (name != null) {
      return name;
    }
    if (percent != null) {
      return percent;
    }
    return "";
  };

  // Build tooltip formatter
  const tooltipFormatter = (params: any) => {
    const value = formatMetric(params.value);
    const percent = formatPercent(params.percent / 100, "chart");
    return `${params.name}: ${value} (${percent})`;
  };

  // Build legend formatter for percentages
  const legendFormatter = showPercentInLegend
    ? (name: string) => {
        const dataIndex = data.findIndex(d => d.name === name);
        if (dataIndex >= 0) {
          const percent = formatPercent(percentages[dataIndex], "legend");
          return `${name} ${percent}`;
        }
        return name;
      }
    : undefined;

  // Calculate center text for "show total"
  let centerText = "";
  if (showTotal && total > 0) {
    centerText = formatMetric(total);
  }

  return {
    tooltip: {
      trigger: "item",
      formatter: tooltipFormatter,
    },
    legend: showLegend
      ? {
          top: "5%",
          left: "center",
          data: data.map(d => String(d.name)),
          formatter: legendFormatter,
        }
      : undefined,
    graphic: showTotal
      ? {
          type: "text",
          left: "center",
          top: "middle",
          style: {
            text: centerText,
            fontSize: 24,
            fontWeight: "bold",
            align: "center",
            fill: "#000",
          },
        }
      : undefined,
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
          show: showLabels || showPercentOnChart,
          formatter: (params: any) => getLabelText(params.dataIndex),
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 40,
            fontWeight: "bold",
            formatter: (params: any) => params.name,
          },
        },
        labelLine: {
          show: showLabels || showPercentOnChart,
        },
        data,
      },
    ],
  };
}
