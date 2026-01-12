import React from "react";
import { t } from "ttag";
import type { EChartsOption } from "echarts";

import { reactNodeToHtmlString } from "metabase/lib/react-to-html";
import { formatValue } from "metabase/lib/formatting";
import { computeMaxDecimalsForValues } from "metabase/visualizations/lib/utils";
import { EChartsTooltip } from "metabase/visualizations/components/ChartTooltip/EChartsTooltip";
import {
  getMarkerColorClass,
  getTooltipBaseOption,
} from "metabase/visualizations/echarts/tooltip";
import type { ComputedVisualizationSettings } from "metabase/visualizations/types";
import type { RawSeries } from "metabase-types/api";

import {
  OTHER_SLICE_KEY,
  getOtherSliceName,
} from "../pie/constants";

export interface DoughnutDataPoint {
  name: string;
  value: number;
  itemStyle?: {
    color: string;
  };
  children?: DoughnutDataPoint[];
}

export function getDonutChartData(
  rawSeries: RawSeries,
  settings: ComputedVisualizationSettings,
  hiddenSlices: Set<string | number> = new Set(),
) {
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
  const dimensionIndex = cols.findIndex((col) => col.name === dimensionName);
  const metricIndex = cols.findIndex((col) => col.name === metricName);
  const metricCol = cols[metricIndex];

  // Create a map of dimension values to metric values from raw data
  const dataMap = new Map<string, number>();
  rows.forEach((row) => {
    const key = String(row[dimensionIndex]);
    const value = Number(row[metricIndex]) || 0;
    dataMap.set(key, value);
  });
  
  // Generate candidate slices based on pieRows and hiddenSlices
  let candidateSlices: DoughnutDataPoint[] = [];

  pieRows.forEach((row: any) => {
    const key = String(row.key);
    if (hiddenSlices.has(key)) return; // Skip hidden logic from external Legend
    if (!row.enabled || row.hidden) return; // Skip disabled config/legacy

    const value = dataMap.get(key) || 0;
    if (value > 0) {
      candidateSlices.push({
        name: row.name || row.key,
        value,
        itemStyle: { color: row.color },
      });
    }
  });

  // Calculate total of CANDIDATES (visible data)
  const totalValue = candidateSlices.reduce((sum, s) => sum + s.value, 0);

  // Logic for "Other" grouping and Max Slices
  const MAX_SLICES = 20;

  // Sort candidates by value descending
  candidateSlices.sort((a, b) => b.value - a.value);

  // Initialize keptSlices with all candidates; pooledSlices is empty initially
  // We bypass 'pie.slice_threshold' to strictly enforce "Top 20" logic
  // as requested ("always 20 slices").
  const keptSlices: DoughnutDataPoint[] = [...candidateSlices];
  const pooledSlices: DoughnutDataPoint[] = [];

  while (keptSlices.length + (pooledSlices.length > 0 ? 1 : 0) > MAX_SLICES) {
    // Move smallest to pool (last element)
    const smallest = keptSlices.pop();
    if (smallest) pooledSlices.push(smallest);
  }

  // 4. Create "Other" slice if pool is not empty
  if (pooledSlices.length > 0) {
    // Sort pooled slices by value descending for the specific drill-down view
    pooledSlices.sort((a, b) => b.value - a.value);
    
    const otherVal = pooledSlices.reduce((sum, s) => sum + s.value, 0);
    keptSlices.push({
      name: getOtherSliceName(),
      value: otherVal,
      itemStyle: { color: "#B8BBC3" },
      children: pooledSlices,
    });
  }

  return {
    data: keptSlices,
    total: totalValue,
    metricCol,
    metricColSettings: settings.column ? settings.column(metricCol) : {},
  };
}

export function getDoughnutChartOption(
  chartData: ReturnType<typeof getDonutChartData>,
  settings: ComputedVisualizationSettings,
  width?: number,
  height?: number,
  containerRef?: React.RefObject<HTMLDivElement>,
): EChartsOption {
  const { data, total, metricCol, metricColSettings } = chartData;
  
  // Calculate percentages based on the final data
  // Note: if 'total' is the sum of visible slices, these percentages sum to 100%.
  const percentages = data.map((d) => (total > 0 ? d.value / total : 0));

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
  const showLabels = settings["pie.show_labels"];
  const showTotal = settings["pie.show_total"];
  const percentVisibility = settings["pie.percent_visibility"];

  // Determine if percentages should be shown on the chart
  const showPercentOnChart =
    percentVisibility === "inside" || percentVisibility === "both";

  // Note: showPercentInLegend is handled by the external component now, 
  // but we keep this logic if we were using internal legend.
  // Actually, we are REMOVING internal legend.

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

  // Build tooltip formatter matching Metabase styles (All Slices + Total)
  const tooltipFormatter = (params: any) => {
    const isOtherHovered = params.name === getOtherSliceName();
    const otherSlice = data.find(d => d.name === getOtherSliceName());
    
    // If hovering "Other" and it has detailed children, show those.
    // Otherwise show ONLY the hovered slice.
    let tooltipData = data;
    if (isOtherHovered && otherSlice?.children) {
      tooltipData = otherSlice.children;
    } else {
      tooltipData = data.filter(d => d.name === params.name);
    }

    // Generate rows
    const tooltipRows = tooltipData.map((d) => {
      // Logic for focus:
      // If showing top-level slices:
      const isFocused = d.name === params.name;
      
      const dValue = formatMetric(d.value);
      const dPercent = formatPercent(
        total > 0 ? d.value / total : 0,
        "chart"
      );
      
      return {
        name: d.name,
        values: [dValue, dPercent], 
        markerColorClass: (!isOtherHovered && d.itemStyle) ? getMarkerColorClass(d.itemStyle.color) : undefined,
        isFocused,
      };
    });

    const tooltipTotal = tooltipData.reduce((sum, d) => sum + d.value, 0);

    const tooltipModel = {
      header: String(settings["pie.dimension"] || "Data"),
      rows: tooltipRows,
      footer: (showTotal && tooltipData.length > 1)
        ? {
            name: t`Total`,
            values: [formatMetric(tooltipTotal), formatPercent(1, "chart")], // 100%
          }
        : undefined,
    };

    return reactNodeToHtmlString(<EChartsTooltip {...tooltipModel} />);
  };

  // Calculate center text for "show total"
  let centerText = "";
  if (showTotal && total > 0) {
    centerText = formatMetric(total);
  }

  // Determine dynamic chart position and radius
  // Since Legend is external now, we don't checking "pie.legend_position".
  // We center the donut occupying most space.
  const center = ["50%", "50%"];

  const hasLabels = showLabels || showPercentOnChart;
  const radius = hasLabels ? ["35%", "55%"] : ["40%", "70%"];
  
  const actualWidth = width ?? 500;
  const actualHeight = height ?? 400;
  
  // Calculate specific pixel coordinates for the center graphic
  const cx = actualWidth * 0.5;
  const cy = actualHeight * 0.5;

  const minDim = Math.min(actualWidth, actualHeight);
  // Adjust inner calculation to match the dynamic radius
  // 55% radius -> ~27% minDim. 
  // We use a safe approximation for text width.
  const innerRadiusPx = (minDim / 2) * (hasLabels ? 0.35 : 0.4); 
  // Available width is diameter of hole minus some padding
  const textMaxWidth = innerRadiusPx * 2 * 0.9;

  return {
    tooltip: {
      ...getTooltipBaseOption(containerRef as React.RefObject<HTMLDivElement>),
      trigger: "item",
      formatter: tooltipFormatter,
    },
    // No internal legend
    graphic: showTotal
      ? {
          type: "text",
          style: {
            x: cx,
            y: cy,
            text: centerText,
            fontSize: 24,
            fontWeight: "bold",
            align: "center",
            verticalAlign: "middle",
            fill: "#000",
            width: textMaxWidth,
            overflow: "truncate",
            ellipsis: "...",
          },
        }
      : undefined,
    series: [
      {
        name: String(settings["pie.dimension"] || "Data"),
        type: "pie",
        radius,
        center,
        avoidLabelOverlap: true,
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
