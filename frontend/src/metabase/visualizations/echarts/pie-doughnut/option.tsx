import type { EChartsOption } from "echarts";
import type { CallbackDataParams } from "echarts/types/dist/shared";
import React from "react";
import { t } from "ttag";

import { colors } from "metabase/ui/colors";
import { reactNodeToHtmlString } from "metabase/utils/react-to-html";
import { formatValue } from "metabase/value-formatting";
import {
  type ComputedVisualizationSettings,
  DIMENSIONS,
  EChartsTooltip,
  type RenderingContext,
  computeMaxDecimalsForValues,
  getMarkerColorClass,
  getOtherSliceName,
  getTooltipBaseOption,
  getTotalText,
} from "metabase/viz-core";
import type { RawSeries } from "metabase-types/api";

import {
  isRecord,
  readSetting,
  settingBoolean,
  settingNumber,
  settingString,
} from "../../lib/read-setting";

type PercentVisibility = "off" | "legend" | "inside" | "both";

function isPercentVisibility(value: unknown): value is PercentVisibility {
  return (
    value === "off" ||
    value === "legend" ||
    value === "inside" ||
    value === "both"
  );
}

type ConfiguredSlice = {
  key: string;
  name: string;
  color: string;
  enabled: boolean;
  hidden: boolean;
};

function configuredSlices(value: unknown): ConfiguredSlice[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((row) => {
    if (!isRecord(row) || typeof row.key !== "string") {
      return [];
    }
    return [
      {
        key: row.key,
        name: typeof row.name === "string" ? row.name : row.key,
        color:
          typeof row.color === "string" ? row.color : colors["text-secondary"],
        enabled: row.enabled !== false,
        hidden: row.hidden === true,
      },
    ];
  });
}

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

  const pieRows = configuredSlices(readSetting(settings, "pie.rows"));
  const dimensionName = settingString(readSetting(settings, "pie.dimension"));
  const metricName = settingString(readSetting(settings, "pie.metric"));

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
  const candidateSlices: DoughnutDataPoint[] = [];

  for (const row of pieRows) {
    if (hiddenSlices.has(row.key) || !row.enabled || row.hidden) {
      continue;
    }

    const value = dataMap.get(row.key) || 0;
    if (value > 0) {
      candidateSlices.push({
        name: row.name,
        value,
        itemStyle: { color: row.color },
      });
    }
  }

  // Calculate total of CANDIDATES (visible data)
  const totalValue = candidateSlices.reduce((sum, s) => sum + s.value, 0);

  // Logic for "Other" grouping based on percentage threshold
  const threshold =
    (settingNumber(readSetting(settings, "pie.slice_threshold")) ?? 0) / 100;

  // Identify slices below threshold
  const sliceBuckets: [DoughnutDataPoint[], DoughnutDataPoint[]] = [[], []];
  let [keptSlices, pooledSlices] = candidateSlices.reduce((acc, slice) => {
    const percentage = totalValue > 0 ? slice.value / totalValue : 0;
    if (percentage < threshold) {
      acc[1].push(slice);
    } else {
      acc[0].push(slice);
    }
    return acc;
  }, sliceBuckets);

  // If there's only one slice below threshold, don't hide it (match standard Pie chart behavior)
  if (pooledSlices.length === 1) {
    const onlySlice = pooledSlices.pop();
    if (onlySlice) {
      keptSlices.push(onlySlice);
    }
  }

  // 4. Create "Other" slice if pool is not empty
  if (pooledSlices.length > 0) {
    // Sort pooled slices by value descending for the specific drill-down view
    pooledSlices.sort((a, b) => b.value - a.value);

    const otherVal = pooledSlices.reduce((sum, s) => sum + s.value, 0);
    keptSlices.push({
      name: getOtherSliceName(),
      value: otherVal,
      itemStyle: { color: colors["text-secondary"] },
      children: pooledSlices,
    });
  }

  // 5. Enforce Max Slice Count (7 including "Other")
  const MAX_SLICES = 7;
  if (keptSlices.length > MAX_SLICES) {
    // Sort all kept slices by value descending to find the smallest ones
    // We exclusion-check for "Other" slice because it might already exist
    const otherName = getOtherSliceName();
    let otherSlice = keptSlices.find((s) => s.name === otherName);
    const normalSlices = keptSlices.filter((s) => s.name !== otherName);

    // Sort normal slices to pick which ones to move to Other
    normalSlices.sort((a, b) => b.value - a.value);

    const numToKeep = MAX_SLICES - 1; // Keep top 6, 7th is Other
    const remainingSlices = normalSlices.slice(0, numToKeep);
    const toPool = normalSlices.slice(numToKeep);

    if (otherSlice) {
      // Merge into existing other
      otherSlice.value += toPool.reduce((sum, s) => sum + s.value, 0);
      otherSlice.children = [...(otherSlice.children || []), ...toPool].sort(
        (a, b) => b.value - a.value,
      );
    } else {
      // Create new other
      const otherVal = toPool.reduce((sum, s) => sum + s.value, 0);
      otherSlice = {
        name: otherName,
        value: otherVal,
        itemStyle: { color: colors["text-secondary"] },
        children: toPool.sort((a, b) => b.value - a.value),
      };
    }

    keptSlices = [...remainingSlices, otherSlice];
  }

  // Final sort of kept slices (including "Other")
  keptSlices.sort((a, b) => {
    const otherName = getOtherSliceName();
    if (a.name === otherName) {
      return 1;
    }
    if (b.name === otherName) {
      return -1;
    }
    return b.value - a.value;
  });

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
  hoveredName?: string,
  renderingContext?: RenderingContext,
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
    let decimals = settingNumber(readSetting(settings, "pie.decimal_places"));
    if (decimals == null) {
      decimals = computeMaxDecimalsForValues(percentages, {
        style: "percent",
        maximumSignificantDigits: location === "legend" ? 3 : 2,
      });
    }

    return String(
      formatValue(value, {
        column: metricCol,
        number_separators: isRecord(metricColSettings)
          ? settingString(metricColSettings.number_separators)
          : undefined,
        number_style: "percent",
        decimals,
      }),
    );
  };

  // Get display settings
  const showLabels =
    settingBoolean(readSetting(settings, "pie.show_labels")) === true;
  const labelColor =
    renderingContext?.getColor("text-primary") ?? colors["text-primary"];
  const showTotal =
    settingBoolean(readSetting(settings, "pie.show_total")) === true;
  const percentSetting = readSetting(settings, "pie.percent_visibility");
  const percentVisibility = isPercentVisibility(percentSetting)
    ? percentSetting
    : undefined;

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
  const tooltipFormatter = (
    params: CallbackDataParams | CallbackDataParams[],
  ) => {
    if (Array.isArray(params)) {
      return "";
    }
    const isOtherHovered = params.name === getOtherSliceName();
    const otherSlice = data.find((d) => d.name === getOtherSliceName());

    // If hovering "Other" and it has detailed children, show those.
    // Otherwise show ALL top-level slices (standard Metabase Pie behavior).
    let tooltipData = data;
    if (isOtherHovered && otherSlice?.children) {
      tooltipData = otherSlice.children;
    } else {
      tooltipData = data;
    }

    // Generate rows
    const tooltipRows = tooltipData.map((d) => {
      // Logic for focus:
      // If showing top-level slices:
      const isFocused = d.name === params.name;

      const dValue = formatMetric(d.value);
      const dPercent = formatPercent(total > 0 ? d.value / total : 0, "chart");

      return {
        name: d.name,
        values: [dValue, dPercent],
        markerColorClass:
          !isOtherHovered && d.itemStyle
            ? getMarkerColorClass(d.itemStyle.color)
            : undefined,
        isFocused,
      };
    });

    const tooltipTotal = tooltipData.reduce((sum, d) => sum + d.value, 0);

    const tooltipModel = {
      header: settingString(readSetting(settings, "pie.dimension")) || "Data",
      rows: tooltipRows,
      footer:
        showTotal && tooltipData.length > 1
          ? {
              name: t`Total`,
              values: [formatMetric(tooltipTotal), formatPercent(1, "chart")], // 100%
            }
          : undefined,
    };

    return reactNodeToHtmlString(<EChartsTooltip {...tooltipModel} />);
  };

  // Calculate center text for "show total"
  let centerValue = "";
  let centerLabel = "";
  if (showTotal && total > 0) {
    const hoveredSlice = hoveredName
      ? data.find((d) => d.name === hoveredName)
      : null;
    if (hoveredSlice) {
      centerValue = formatMetric(hoveredSlice.value);
      centerLabel = hoveredSlice.name;
    } else {
      centerValue = formatMetric(total);
      centerLabel = getTotalText();
    }
  }

  // Determine dynamic chart position and radius
  // Since Legend is external now, we don't checking "pie.legend_position".
  // We center the donut occupying most space.
  const center = ["50%", "50%"];

  const hasLabels = showLabels || showPercentOnChart;
  const radius = hasLabels ? ["50%", "70%"] : ["55%", "85%"];

  const actualWidth = width ?? 500;
  const actualHeight = height ?? 400;
  const minDim = Math.min(actualWidth, actualHeight);
  // Adjust inner calculation to match the dynamic radius
  // 70% radius -> ~35% minDim.
  // We use a safe approximation for text width.
  const innerRadiusPx = (minDim / 2) * (hasLabels ? 0.5 : 0.55);
  // Available width is diameter of hole minus some padding
  const textMaxWidth = innerRadiusPx * 2 * 0.9;

  return {
    tooltip: {
      ...getTooltipBaseOption(
        // React 19 RefObject is invariant, and this helper allows a null current.
        containerRef as React.RefObject<HTMLDivElement | null>,
      ),
      trigger: "item",
      formatter: tooltipFormatter,
    },
    // No internal legend
    graphic: showTotal
      ? {
          type: "group",
          left: "center",
          top: "center",
          children: [
            {
              // Value
              type: "text",
              style: {
                text: centerValue,
                fontSize: DIMENSIONS.total.valueFontSize,
                fontWeight: DIMENSIONS.total.fontWeight,
                align: "center",
                fill:
                  renderingContext?.getColor("text-primary") ??
                  colors["text-primary"],
                width: textMaxWidth,
                overflow: "truncate",
                ellipsis: "...",
              },
              left: "center",
              top: centerLabel ? -14 : 0,
            },
            {
              // Label
              type: "text",
              style: {
                text: centerLabel,
                fontSize: DIMENSIONS.total.labelFontSize,
                fontWeight: DIMENSIONS.total.fontWeight,
                align: "center",
                fill:
                  renderingContext?.getColor("text-secondary") ??
                  colors["text-secondary"],
                width: textMaxWidth,
                overflow: "truncate",
                ellipsis: "...",
              },
              left: "center",
              top: 14,
            },
          ],
        }
      : undefined,
    series: [
      {
        name: settingString(readSetting(settings, "pie.dimension")) || "Data",
        type: "pie",
        radius,
        center,
        avoidLabelOverlap: true,
        itemStyle: {
          borderWidth: 2,
          borderRadius: 10,
          borderColor: "transparent",
        },
        label: {
          show: showLabels || showPercentOnChart,
          color: labelColor,
          // ECharts otherwise strokes the label with a light halo.
          textBorderWidth: 0,
          formatter: (params: { dataIndex: number }) =>
            getLabelText(params.dataIndex),
        },
        emphasis: {
          label: {
            show: showLabels || showPercentOnChart,
            color: labelColor,
            fontWeight: "normal",
            textBorderWidth: 0,
            formatter: (params: { dataIndex: number }) =>
              getLabelText(params.dataIndex),
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
