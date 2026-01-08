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

interface GaugeRenderItemParams {
  coordSys: {
    cx: number;
    cy: number;
  };
}

function convertToPolarPoint(
  renderItemParams: GaugeRenderItemParams,
  radius: number,
  radian: number,
) {
  return [
    Math.cos(radian) * radius + renderItemParams.coordSys.cx,
    -Math.sin(radian) * radius + renderItemParams.coordSys.cy,
  ];
}

function makePointerPoints(
  renderItemParams: GaugeRenderItemParams,
  polarEndRadian: number,
) {
  return [
    convertToPolarPoint(renderItemParams, OUTER_RADIUS, polarEndRadian),
    convertToPolarPoint(
      renderItemParams,
      OUTER_RADIUS,
      polarEndRadian + Math.PI * 0.03,
    ),
    convertToPolarPoint(renderItemParams, POINTER_INNER_RADIUS, polarEndRadian),
  ];
}

function makeText(valOnRadian: number, maxValue: number) {
  return ((valOnRadian / maxValue) * 100).toFixed(0) + "%";
}

function renderItem(params: any, api: any): any {
  const valOnRadian = api.value(1);
  const coords = api.coord([api.value(0), valOnRadian]);
  const polarEndRadian = coords[3];

  return {
    type: "group" as const,
    children: [
      // Outer ring (background)
      {
        type: "sector",
        shape: {
          cx: params.coordSys.cx,
          cy: params.coordSys.cy,
          r: OUTER_RADIUS,
          r0: INNER_RADIUS,
          startAngle: 0,
          endAngle: Math.PI * 2,
        },
        style: {
          fill: "#E0E6F1",
        },
      },
      // Active arc
      {
        type: "sector",
        shape: {
          cx: params.coordSys.cx,
          cy: params.coordSys.cy,
          r: OUTER_RADIUS,
          r0: INNER_RADIUS,
          startAngle: 0,
          endAngle: -polarEndRadian,
        },
        style: {
          fill: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 1,
            y2: 1,
            colorStops: [
              { offset: 0, color: "#4C6BA7" },
              { offset: 1, color: "#6B8DD6" },
            ],
          },
        },
        transition: ["shape"],
        enterFrom: {
          shape: {
            endAngle: 0,
          },
        },
      },
      // Pointer
      {
        type: "polygon",
        shape: {
          points: makePointerPoints(params, polarEndRadian),
        },
        style: {
          fill: "#4C6BA7",
        },
        extra: {
          polarEndRadian: polarEndRadian,
          transition: "polarEndRadian",
          enterFrom: { polarEndRadian: 0 },
        },
        during: function (apiDuring: any) {
          apiDuring.setShape(
            "points",
            makePointerPoints(params, apiDuring.getExtra("polarEndRadian")),
          );
        },
      },
      // Inner circle
      {
        type: "circle",
        shape: {
          cx: params.coordSys.cx,
          cy: params.coordSys.cy,
          r: INSIDE_PANEL_RADIUS,
        },
        style: {
          fill: "#fff",
          shadowBlur: 25,
          shadowOffsetX: 0,
          shadowOffsetY: 0,
          shadowColor: "rgba(76,107,167,0.4)",
        },
      },
      // Center text
      {
        type: "text",
        extra: {
          valOnRadian: valOnRadian,
          transition: "valOnRadian",
          enterFrom: { valOnRadian: 0 },
        },
        style: {
          text: makeText(valOnRadian, VAL_ON_RADIAN_MAX),
          fontSize: 50,
          fontWeight: 700,
          x: params.coordSys.cx,
          y: params.coordSys.cy,
          fill: "rgb(0,50,190)",
          align: "center",
          verticalAlign: "middle",
          enterFrom: { opacity: 0 },
        },
        during: function (apiDuring: any) {
          apiDuring.setStyle(
            "text",
            makeText(apiDuring.getExtra("valOnRadian"), VAL_ON_RADIAN_MAX),
          );
        },
      },
    ],
  };
}

export function getGaugeChartOption(
  rawSeries: RawSeries,
  settings: ComputedVisualizationSettings,
): EChartsOption {
  const [
    {
      data: { rows },
    },
  ] = rawSeries;

  // Get the value from the data
  let value = 0;
  if (rows.length > 0 && rows[0].length > 0) {
    value = Number(rows[0][0]) || 0;
  }

  // Get min and max from settings or use defaults
  const minValue = settings["gauge.min"] ?? 0;
  const maxValue = settings["gauge.max"] ?? 100;

  // Normalize value to 0-100 range for the gauge
  const range = maxValue - minValue;
  const normalizedValue =
    range > 0
      ? Math.min(Math.max(((value - minValue) / range) * 100, 0), 100)
      : 0;

  return {
    animationEasing: ANIMATION_EASING,
    animationDuration: ANIMATION_DURATION,
    animationDurationUpdate: ANIMATION_DURATION,
    animationEasingUpdate: ANIMATION_EASING,
    dataset: {
      source: [[1, normalizedValue]],
    },
    tooltip: {
      formatter: () => {
        return `${value.toFixed(2)}`;
      },
    },
    angleAxis: {
      type: "value",
      startAngle: 0,
      show: false,
      min: 0,
      max: VAL_ON_RADIAN_MAX,
    },
    radiusAxis: {
      type: "value",
      show: false,
    },
    polar: {},
    series: [
      {
        type: "custom",
        coordinateSystem: "polar",
        renderItem: renderItem,
      },
    ],
  };
}

export function getGaugeMeterOption(
  rawSeries: RawSeries,
  settings: ComputedVisualizationSettings,
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

  // Get min, max, and color from settings or use defaults
  const minValue = settings["gauge.min"] ?? 0;
  const maxValue = settings["gauge.max"] ?? 100;
  const gaugeColor = settings["gauge.color"] ?? "#58D9F9";

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

  // Calculate dynamic width based on the formatted value length
  // Estimate: ~30px per character for 50px font, plus padding (40px on each side)
  const estimatedCharWidth = 30;
  const padding = 80; // 40px padding on each side
  const minWidth = 120; // Minimum width for very short values
  const maxWidth = 400; // Maximum width to prevent it from being too wide
  const calculatedWidth = Math.min(
    Math.max(
      formattedValueString.length * estimatedCharWidth + padding,
      minWidth,
    ),
    maxWidth,
  );

  return {
    series: [
      {
        type: "gauge",
        startAngle: 180,
        endAngle: 0,
        min: minValue,
        max: maxValue,
        splitNumber: 12,
        itemStyle: {
          color: gaugeColor,
          shadowColor: "rgba(0,138,255,0.45)",
          shadowBlur: 10,
          shadowOffsetX: 2,
          shadowOffsetY: 2,
        },
        progress: {
          show: true,
          roundCap: true,
          width: 18,
        },
        pointer: {
          icon: "path://M2090.36389,615.30999 L2090.36389,615.30999 C2091.48372,615.30999 2092.40383,616.194028 2092.44859,617.312956 L2096.90698,728.755929 C2097.05155,732.369577 2094.2393,735.416212 2090.62566,735.56078 C2090.53845,735.564269 2090.45117,735.566014 2090.36389,735.566014 L2090.36389,735.566014 C2086.74736,735.566014 2083.81557,732.63423 2083.81557,729.017692 C2083.81557,728.930412 2083.81732,728.84314 2083.82081,728.755929 L2088.2792,617.312956 C2088.32396,616.194028 2089.24407,615.30999 2090.36389,615.30999 Z",
          length: "75%",
          width: 16,
          offsetCenter: [0, "5%"],
        },
        axisLine: {
          roundCap: true,
          lineStyle: {
            width: 18,
          },
        },
        axisTick: {
          splitNumber: 2,
          lineStyle: {
            width: 2,
            color: "#999",
          },
        },
        splitLine: {
          length: 12,
          lineStyle: {
            width: 3,
            color: "#999",
          },
        },
        axisLabel: {
          distance: 30,
          color: "#999",
          fontSize: 20,
          formatter: formatAxisLabel,
        },
        title: {
          show: false,
        },
        detail: {
          backgroundColor: "#fff",
          borderColor: "#999",
          borderWidth: 2,
          width: calculatedWidth,
          lineHeight: 40,
          height: 40,
          borderRadius: 8,
          offsetCenter: [0, "35%"],
          valueAnimation: true,
          formatter: function () {
            // Use the actual query value, not the parameter from ECharts
            return "{value|" + formattedValueString + "}";
          },
          rich: {
            value: {
              fontSize: 50,
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
