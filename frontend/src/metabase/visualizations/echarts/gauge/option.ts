import type { EChartsOption } from "echarts";

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
      data: { cols, rows },
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
