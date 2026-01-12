import type { EChartsCoreOption } from "echarts/core";
import type { XAXisOption, YAXisOption } from "echarts/types/dist/shared";
import type { OptionSourceData } from "echarts/types/src/util/types";

import { alpha } from "metabase/lib/colors";
import {
  NEGATIVE_STACK_TOTAL_DATA_KEY,
  OTHER_DATA_KEY,
  POSITIVE_STACK_TOTAL_DATA_KEY,
  X_AXIS_DATA_KEY,
} from "metabase/visualizations/echarts/cartesian/constants/dataset";
import type { CartesianChartModel } from "metabase/visualizations/echarts/cartesian/model/types";
import { buildAxes } from "metabase/visualizations/echarts/cartesian/option/axis";
import { buildEChartsSeries } from "metabase/visualizations/echarts/cartesian/option/series";
import { getTimelineEventsSeries } from "metabase/visualizations/echarts/cartesian/timeline-events/option";
import type { TimelineEventsModel } from "metabase/visualizations/echarts/cartesian/timeline-events/types";
import type {
  ComputedVisualizationSettings,
  RenderingContext,
} from "metabase/visualizations/types";
import type { TimelineEventId } from "metabase-types/api";

import type { ChartMeasurements } from "../chart-measurements/types";
import { CHART_STYLE } from "../constants/style";
import { getBarSeriesDataLabelKey } from "../model/util";

import { getGoalLineSeriesOption } from "./goal-line";
import { getTrendLinesOption } from "./trend-line";
import type { EChartsSeriesOption } from "./types";

export const getSharedEChartsOptions = (isAnimated: boolean) => ({
  useUTC: true,
  animation: isAnimated,
  animationDuration: 0,
  animationDurationUpdate: 1, // by setting this to 1ms we visually eliminate shape transitions while preserving opacity transitions
  toolbox: {
    show: false,
  },
  brush: {
    toolbox: ["lineX" as const],
    xAxisIndex: 0,
    throttleType: "debounce" as const,
    throttleDelay: 200,
  },
});

type Axes = ReturnType<typeof buildAxes>;

type NonCategoryYAxisOption = Exclude<YAXisOption, { type?: "category" }>;
const isNonCategoryYAxisOption = (
  axis: YAXisOption,
): axis is NonCategoryYAxisOption => axis.type !== "category";

export const ensureRoomForLabels = (
  axes: Axes,
  { leftAxisModel, rightAxisModel }: CartesianChartModel,
  chartMeasurements: ChartMeasurements,
  seriesOption: EChartsSeriesOption[],
): Axes => ({
  ...axes,
  yAxis: axes.yAxis.map((axis) => {
    const axisModel = axis.position === "left" ? leftAxisModel : rightAxisModel;
    if (!axisModel) {
      return axis;
    }
    const isAxisUsedForBarChart = axisModel.seriesKeys.some((key) => {
      return seriesOption.some((o) => o.id === key && o.type === "bar");
    });
    if (!isAxisUsedForBarChart) {
      return axis;
    }
    const [min] = axisModel.extent;
    if (min < 0) {
      const { bounds } = chartMeasurements;
      const innerHeight = Math.abs(bounds.bottom - bounds.top);
      const labelPct = CHART_STYLE.seriesLabels.size / innerHeight;
      const lowerBoundaryGap = labelPct / 2; // `/ 2` because it's okay if the bar label overlaps the axis *line*, we just don't want it to overlap the axis *labels*

      // Only apply numeric boundaryGap to non-category axes
      if (!isNonCategoryYAxisOption(axis)) {
        return axis;
      }

      return { ...axis, boundaryGap: [lowerBoundaryGap, 0] };
    }
    return axis;
  }),
});

export const getCartesianChartOption = (
  chartModel: CartesianChartModel,
  chartMeasurements: ChartMeasurements,
  timelineEventsModel: TimelineEventsModel | null,
  selectedTimelineEventsIds: TimelineEventId[],
  settings: ComputedVisualizationSettings,
  chartWidth: number,
  isAnimated: boolean,
  renderingContext: RenderingContext,
): EChartsCoreOption => {
  const hasTimelineEvents = timelineEventsModel != null;
  const timelineEventsSeries = hasTimelineEvents
    ? getTimelineEventsSeries(
        timelineEventsModel,
        selectedTimelineEventsIds,
        renderingContext,
      )
    : null;

  const dataSeriesOptions = buildEChartsSeries(
    chartModel,
    settings,
    chartWidth,
    chartMeasurements,
    renderingContext,
  );
  const goalSeriesOption = getGoalLineSeriesOption(
    chartModel,
    settings,
    renderingContext,
  );
  const trendSeriesOption = getTrendLinesOption(chartModel);

  const seriesOption = [
    // Data series should always come first for correct labels positioning
    // since series labelLayout function params return seriesIndex which is used to access label value
    dataSeriesOptions,
    goalSeriesOption,
    trendSeriesOption,
    timelineEventsSeries,
  ].flatMap((option) => option ?? []);

  // dataset option
  const dimensions = [
    X_AXIS_DATA_KEY,
    OTHER_DATA_KEY,
    POSITIVE_STACK_TOTAL_DATA_KEY,
    NEGATIVE_STACK_TOTAL_DATA_KEY,
    ...chartModel.seriesModels.map((seriesModel) => [
      seriesModel.dataKey,
      getBarSeriesDataLabelKey(seriesModel.dataKey, "+"),
      getBarSeriesDataLabelKey(seriesModel.dataKey, "-"),
    ]),
  ].flatMap((dimension) => dimension);

  const echartsDataset = [
    {
      // Type cast is needed here because echarts' internal types are incorrect.
      // Their types do not allow booleans, but in reality booleans do work as
      // data values, see this example
      // https://echarts.apache.org/examples/en/editor.html?c=line-simple&code=PYBwLglsB2AEC8sDeAoWsAmBDMWDOApmAFzJrqx7ACuATgMYGkDaSARFm6QGZYA2hADSw2AIy6wAjAF9h7TqTC1qBYWIkAmaQF1ys8gA8AggYh5SqCrDABPEE1gByejgIBzYLRuPBe3-hsTMwtydFt7UkcAN34VRz9yQloIAnNYZlCyKzC7B0c-CGgCH0z0Amh6YAwHS2z0A1IONn862BtG8VLYaUye9F1pAG4gA
      source: chartModel.transformedDataset as OptionSourceData,
      dimensions,
    },
  ];

  if (chartModel.trendLinesModel) {
    echartsDataset.push({
      source: chartModel.trendLinesModel?.dataset as OptionSourceData,
      dimensions: [
        X_AXIS_DATA_KEY,
        ...chartModel.trendLinesModel?.seriesModels.map((s) => s.dataKey),
      ],
    });
  }

  // Check if chart has bar series and dataZoom is enabled
  const hasBarSeries = seriesOption.some(series => series.type === "bar");
  const isDataZoomEnabled =
    hasBarSeries && settings["bar.data_zoom_enabled"] === true;
  const isModernDesign = hasBarSeries && settings["bar.modern_design"] === true;

  // Calculate grid right padding to accommodate Y-axis dataZoom
  const gridRight = isDataZoomEnabled
    ? Math.max(chartMeasurements.padding.right || 0, 50)
    : chartMeasurements.padding.right;

  // Build axes with modern styling if enabled
  const axesConfig = buildAxes(
    chartModel,
    chartWidth,
    chartMeasurements,
    settings,
    hasTimelineEvents,
    renderingContext,
  );

  // Apply modern styling to axes if enabled
  let modernAxesConfig = axesConfig;
  if (isModernDesign) {
    // Modern X-axis styling (xAxis is always a single object, not an array)
    const modernXAxis = axesConfig.xAxis
      ? {
          ...axesConfig.xAxis,
          boundaryGap: true, // Ensure bars align with category labels
          axisTick: {
            show: false, // Hide ticks for cleaner look
          },
        }
      : axesConfig.xAxis;

    // Modern Y-axis styling with subtle grid lines (yAxis is always an array)
    const modernYAxis = Array.isArray(axesConfig.yAxis)
      ? axesConfig.yAxis.map((axis: any, index: number) => ({
          ...axis,
          axisLine: {
            show: false, // Hide axis line for cleaner look
          },
          axisTick: {
            show: false,
          },
          splitLine:
            index === 0
              ? {
                  // Only show grid lines on left axis
                  show: true,
                  lineStyle: {
                    color: alpha(renderingContext.getColor("border"), 0.3),
                    width: 1,
                    type: "dashed",
                  },
                }
              : {
                  show: false,
                },
        }))
      : axesConfig.yAxis;

    modernAxesConfig = {
      xAxis: modernXAxis as XAXisOption,
      yAxis: modernYAxis as YAXisOption[],
    };
  }

  // Get tooltip option (will be merged later)
  const baseOption: EChartsCoreOption = {
    ...getSharedEChartsOptions(isAnimated),
    grid: {
      ...chartMeasurements.padding,
      outerBoundsMode: "none",
      right: gridRight,
    },
    dataset: echartsDataset,
    series: seriesOption,
    ...ensureRoomForLabels(
      buildAxes(
        chartModel,
        chartWidth,
        chartMeasurements,
        settings,
        hasTimelineEvents,
        renderingContext,
      ),
      chartModel,
      chartMeasurements,
      dataSeriesOptions,
    ),
    ...modernAxesConfig,
    // Add dataZoom for bar charts when enabled (mix zooming: slider, inside, and Y-axis)
    ...(isDataZoomEnabled
      ? {
          dataZoom: [
            {
              // Slider data zoom (horizontal at bottom)
              show: true,
              type: "slider",
              start: 0,
              end: 100,
              height: 20,
              bottom: 10,
            },
            {
              // Inside data zoom (mouse wheel/gesture)
              type: "inside",
              start: 0,
              end: 100,
            },
            {
              // Y-axis data zoom (vertical slider on the right)
              show: true,
              yAxisIndex: 0,
              filterMode: "empty",
              width: 30,
              height: "80%",
              showDataShadow: false,
              right: 10,
            },
          ],
        }
      : {}),
  };

  // Apply modern tooltip styling if enabled
  if (isModernDesign && baseOption.tooltip) {
    const existingTooltip = baseOption.tooltip as any;
    baseOption.tooltip = {
      ...existingTooltip,
      backgroundColor: renderingContext.getColor("bg-white"),
      borderColor: renderingContext.getColor("border"),
      borderWidth: 1,
      borderRadius: 12,
      padding: [12, 16],
      textStyle: {
        ...(existingTooltip.textStyle || {}),
        color: renderingContext.getColor("text-dark"),
        fontSize: 13,
        fontWeight: 500,
      },
      extraCssText: `
        box-shadow: 0 4px 12px ${alpha(renderingContext.getColor("text-dark"), 0.15)};
        backdrop-filter: blur(8px);
      `,
    };
  }

  return baseOption;
};
