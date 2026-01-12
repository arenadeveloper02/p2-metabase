/* eslint-disable no-color-literals */
import type { EChartsOption } from "echarts";

import { formatValue } from "metabase/lib/formatting";
import type { ComputedVisualizationSettings } from "metabase/visualizations/types";
import type { RawSeries } from "metabase-types/api";

const ANIMATION_DURATION = 1000;
const ANIMATION_EASING = "quarticInOut";
const VAL_ON_RADIAN_MAX = 100; // Use 100 as max for percentage
const OUTER_RADIUS = 200;
const INNER_RADIUS = 170;
const POINTER_INNER_RADIUS = 40;
const INSIDE_PANEL_RADIUS = 140;



interface GaugeSegment {
  min: number;
  max: number;
  color?: string;
  label?: string;
}

function segmentIsValid(s: GaugeSegment): boolean {
  return !isNaN(s.min) && !isNaN(s.max);
}

export function getGaugeMeterOption(
  rawSeries: RawSeries,
  settings: ComputedVisualizationSettings,
  width?: number,
  height?: number,
): EChartsOption {
  const [
    {
      data: { cols, rows },
    },
  ] = rawSeries;

  // -----------------------------
  // Value handling
  // -----------------------------
  let value = 0;
  if (rows.length > 0 && rows[0].length > 0) {
    value = Number(rows[0][0]) || 0;
  }

  const minValue = settings["gauge.min"] ?? 0;
  const maxValue = settings["gauge.max"] ?? 100;
  const gaugeColor = settings["gauge.color"] ?? "#58D9F9";

  const clampedValue = Math.min(Math.max(value, minValue), maxValue);

  // -----------------------------
  // Formatting
  // -----------------------------
  const column = cols?.[0];
  const columnSettings =
    column && settings?.column ? settings.column(column) : {};

  const formattedValue = formatValue(value, {
    column,
    ...columnSettings,
    compact: false,
  });

  const formattedValueString = String(formattedValue);

  const { prefix, suffix, ...axisLabelSettings } = columnSettings;
  const formatAxisLabel = (labelValue: number): string => {
    return String(
      formatValue(labelValue, {
        column,
        ...axisLabelSettings,
        compact: false,
      }),
    );
  };

  // -----------------------------
  // Dynamic Scaling
  // -----------------------------
  // We use a base radius of 200px (approx) for the "desktop" or default size.
  // The gauge is a semicircle (aspect 2:1 width:height), plus some padding.
  // We calculate a scaling factor based on the container dimensions.
  const BASE_RADIUS = 280; // A reference radius that matches the "desktop" look logic
  const actualWidth = width ?? 600;
  const actualHeight = height ?? 400;

  // The chart wants to be 2*r wide and 1*r tall roughly.
  // We check which dimension constrains the radius more.
  // Also assume some padding.
  const radius = Math.min(actualWidth / 2, actualHeight) * 0.85;
  const scale = radius / BASE_RADIUS;

  // Dynamic split number to prevent overcrowding
  // User requested to consider height as well.
  // For a semi-circle, height corresponds to half width, so we compare width vs height*2.
  const limitingSize = Math.min(actualWidth, actualHeight * 2);
  const splitNumber =
    limitingSize < 300
      ? 4
      : limitingSize < 400
      ? 6
      : 8;

  // -----------------------------
  // Dynamic detail box width
  // -----------------------------
  // Font size is 50 * scale. Average digit width ~0.6em = 30 * scale.
  // We bump estimate to 35 to be safer, and increase padding.
  const fontSize = 50 * scale;
  const estimatedCharWidth = fontSize * 0.75;
  const padding = 60 * scale;
  const minWidth = 120 * scale;

  // Allow growing up to 80% of the chart width
  const maxAllowedWidth = limitingSize * 0.8;

  const calculatedWidth = Math.min(
    Math.max(
      formattedValueString.length * estimatedCharWidth + padding,
      minWidth,
    ),
    maxAllowedWidth,
  );

  // -----------------------------
  // Base series with scaled values
  // -----------------------------
  return {
    series: [
      {
        type: "gauge" as const,
        startAngle: 180,
        endAngle: 0,
        min: minValue,
        max: maxValue,
        splitNumber: splitNumber,
        radius: "100%",

        itemStyle: {
          color: gaugeColor,
          shadowColor: "rgba(0,138,255,0.45)",
          shadowBlur: 10 * scale,
          shadowOffsetX: 2 * scale,
          shadowOffsetY: 2 * scale,
        },

        progress: {
          show: true,
          roundCap: true,
          width: 18 * scale,
        },

        pointer: {
          icon: "path://M2090.36389,615.30999 L2090.36389,615.30999 C2091.48372,615.30999 2092.40383,616.194028 2092.44859,617.312956 L2096.90698,728.755929 C2097.05155,732.369577 2094.2393,735.416212 2090.62566,735.56078 C2090.53845,735.564269 2090.45117,735.566014 2090.36389,735.566014 L2090.36389,735.566014 C2086.74736,735.566014 2083.81557,732.63423 2083.81557,729.017692 C2083.81557,728.930412 2083.81732,728.84314 2083.82081,728.755929 L2088.2792,617.312956 C2088.32396,616.194028 2089.24407,615.30999 2090.36389,615.30999 Z",
          length: "75%",
          width: 16 * scale,
          offsetCenter: [0, "5%"],
        },

        axisLine: {
          roundCap: true,
          lineStyle: {
            width: 18 * scale,
          },
        },

        axisTick: {
          splitNumber: 2,
          length: 6 * scale,
          lineStyle: {
            width: 2 * scale,
            color: "#999",
          },
        },

        splitLine: {
          length: 12 * scale,
          lineStyle: {
            width: 3 * scale,
            color: "#999",
          },
        },

        axisLabel: {
          distance: 30 * scale,
          fontSize: 20 * scale,
          color: "#999",
          formatter: formatAxisLabel,
        },

        title: { show: false },

        detail: {
          backgroundColor: "#fff",
          borderColor: "#999",
          borderWidth: 2 * scale,
          width: calculatedWidth,
          height: 40 * scale,
          lineHeight: 40 * scale,
          borderRadius: 8 * scale,
          offsetCenter: [0, "35%"],
          valueAnimation: true,
          formatter: () => `{value|${formattedValueString}}`,
          rich: {
            value: {
              fontSize: 50 * scale,
              fontWeight: 700,
              color: "#777",
            },
          },
        },

        data: [{ value: clampedValue }],
      },
    ],
  };
}

export function getGaugeStageOption(
  rawSeries: RawSeries,
  settings: ComputedVisualizationSettings,
  width?: number,
  height?: number,
): EChartsOption {
  const [
    {
      data: { cols, rows },
    },
  ] = rawSeries;

  // Get the value from the data
  let value = 0;
  if (rows.length > 0 && rows[0].length > 0) {
    value = Number(rows[0][0]) || 0;
  }

  // Get segments/ranges from settings
  const segments = (settings["gauge.segments"] || []).filter(
    segmentIsValid,
  ) as GaugeSegment[];

  // Calculate min and max from segments or use defaults
  let minValue = settings["gauge.min"] ?? 0;
  let maxValue = settings["gauge.max"] ?? 100;

  if (segments.length > 0) {
    const allValues = [
      ...segments.map((s: GaugeSegment) => s.min),
      ...segments.map((s: GaugeSegment) => s.max),
    ];
    minValue = Math.min(...allValues);
    maxValue = Math.max(...allValues);
  }

  // Clamp value to min/max range
  const clampedValue = Math.min(Math.max(value, minValue), maxValue);

  // Get column for formatting
  const column = cols?.[0];
  const columnSettings =
    column && settings?.column ? settings.column(column) : {};

  // Format value function - format the actual query value, not the clamped value
  // Include prefix and suffix for the bottom detail value
  const formattedValue = formatValue(value, {
    column,
    ...columnSettings,
    compact: false,
  });
  const formattedValueString = String(formattedValue);

  // Create a formatter function for axis labels that uses the same formatting
  // but excludes prefix and suffix
  const { prefix, suffix, ...axisLabelSettings } = columnSettings;
  const formatAxisLabel = (labelValue: number): string => {
    const formatted = formatValue(labelValue, {
      column,
      ...axisLabelSettings,
      compact: false,
    });
    return String(formatted);
  };

  // Convert segments to ECharts color array format
  // Format: [[ratio, color], [ratio, color], ...]
  // Ratio is the position (0-1) where the color should start
  const colorStops: Array<[number, string]> = [];
  if (segments.length > 0) {
    const range = maxValue - minValue;
    segments.forEach((segment: GaugeSegment) => {
      if (range > 0) {
        const ratio = (segment.max - minValue) / range;
        colorStops.push([ratio, segment.color || "#999"]);
      }
    });
    // Ensure we have at least one color stop
    if (colorStops.length === 0) {
      colorStops.push([1, "#999"]);
    }
  } else {
    // Default colors if no segments
    colorStops.push([0.3, "#67e0e3"], [0.7, "#37a2da"], [1, "#fd666d"]);
  }

  // -----------------------------
  // Dynamic Scaling
  // -----------------------------
  // We use a base radius of 280px (same as meter gauge) to establish the ratio.
  const BASE_RADIUS = 280;
  const actualWidth = width ?? 600;
  const actualHeight = height ?? 400;

  const radius = Math.min(actualWidth / 2, actualHeight) * 0.85;
  const scale = radius / BASE_RADIUS;

  // Calculate dynamic width based on the formatted value length
  // Font size is 50 * scale. Average digit width ~0.6em = 30 * scale.
  const fontSize = 50 * scale;
  const estimatedCharWidth = fontSize * 0.75;
  const padding = 60 * scale;
  const minWidth = 120 * scale;

  // Use a limiting size logic similar to meter gauge for consistency if needed,
  // or just use actualWidth since stage gauge doesn't define 'limitingSize' variable above yet.
  const limitingSize = Math.min(actualWidth, actualHeight * 2);
  const maxAllowedWidth = limitingSize * 0.8;

  const calculatedWidth = Math.min(
    Math.max(
      formattedValueString.length * estimatedCharWidth + padding,
      minWidth,
    ),
    maxAllowedWidth,
  );

  return {
    series: [
      {
        type: "gauge",
        startAngle: 180,
        endAngle: 0,
        min: minValue,
        max: maxValue,
        radius: "100%",

        axisLine: {
          lineStyle: {
            width: 30 * scale,
            color: colorStops,
          },
        },
        pointer: {
          itemStyle: {
            color: "auto",
          },
          width: 8 * scale,
          length: "60%",
        },
        axisTick: {
          distance: -30 * scale,
          length: 8 * scale,
          lineStyle: {
            color: "#fff",
            width: 2 * scale,
          },
        },
        splitLine: {
          distance: -30 * scale,
          length: 30 * scale,
          lineStyle: {
            color: "#fff",
            width: 4 * scale,
          },
        },
        axisLabel: {
          color: "inherit",
          distance: 40 * scale,
          fontSize: 20 * scale,
          formatter: formatAxisLabel,
        },
        detail: {
          valueAnimation: true,
          formatter: function () {
            // Use the actual query value, not the parameter from ECharts
            return "{value|" + formattedValueString + "}";
          },
          color: "inherit",
          backgroundColor: "#fff",
          borderColor: "#999",
          borderWidth: 2 * scale,
          width: calculatedWidth,
          lineHeight: 40 * scale,
          height: 40 * scale,
          borderRadius: 8 * scale,
          offsetCenter: [0, "40%"],
          rich: {
            value: {
              fontSize: 50 * scale,
              fontWeight: "bolder",
              color: "#777",
            },
          },
        },
        data: [
          {
            value: clampedValue,
          },
        ],
      },
    ],
  };
}
