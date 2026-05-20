import Color from "color";
import type { EChartsCoreOption } from "echarts/core";
<<<<<<< HEAD
import type { XAXisOption, YAXisOption } from "echarts/types/dist/shared";
=======
import type {
  GridOption,
  XAXisOption,
  YAXisOption,
} from "echarts/types/dist/shared";
>>>>>>> master
import type { OptionSourceData } from "echarts/types/src/util/types";

import { alpha } from "metabase/lib/colors";
import {
  NEGATIVE_STACK_TOTAL_DATA_KEY,
  OTHER_DATA_KEY,
  POSITIVE_STACK_TOTAL_DATA_KEY,
  X_AXIS_DATA_KEY,
} from "metabase/visualizations/echarts/cartesian/constants/dataset";
import type {
  BaseCartesianChartModel,
  CartesianChartModel,
  SeriesModel,
} from "metabase/visualizations/echarts/cartesian/model/types";
import {
  buildAxes,
  buildDimensionAxis,
  buildMetricAxis,
} from "metabase/visualizations/echarts/cartesian/option/axis";
import { buildEChartsSeries } from "metabase/visualizations/echarts/cartesian/option/series";
import {
  type SplitPanelYExtent,
  getTimelineEventsSeries,
} from "metabase/visualizations/echarts/cartesian/timeline-events/option";
import type { TimelineEventsModel } from "metabase/visualizations/echarts/cartesian/timeline-events/types";
import type {
  ComputedVisualizationSettings,
  RenderingContext,
} from "metabase/visualizations/types";
import type { TimelineEventId } from "metabase-types/api";

import { CHART_STYLE, Z_INDEXES } from "../constants/style";
import type { ChartLayout } from "../layout/types";
import { getDisplaySeriesSettingsByDataKey } from "../model/series";
import { getBarSeriesDataLabelKey } from "../model/util";

import { getGoalLineParams, getGoalLineSeriesOption } from "./goal-line";
import { getTrendLinesOption } from "./trend-line";
import type { EChartsSeriesOption } from "./types";

export function getBrushStyle(renderingContext: RenderingContext) {
  const brandColor = Color(renderingContext.getColor("brand"));
  return {
    fill: brandColor.alpha(CHART_STYLE.brush.fillOpacity).string(),
    borderColor: brandColor.alpha(CHART_STYLE.brush.borderOpacity).string(),
    borderWidth: CHART_STYLE.brush.borderWidth,
  };
}

export const getSharedEChartsOptions = (
  isAnimated: boolean,
  renderingContext: RenderingContext,
) => ({
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
    brushStyle: {
      color: getBrushStyle(renderingContext).fill,
      borderWidth: 0,
    },
  },
});

export const buildEChartsDataset = (
  chartModel: BaseCartesianChartModel,
): Array<{ source: OptionSourceData; dimensions: string[] }> => {
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

  const dataset: Array<{ source: OptionSourceData; dimensions: string[] }> = [
    {
      source: chartModel.transformedDataset as OptionSourceData,
      dimensions,
    },
  ];

  if (chartModel.trendLinesModel) {
    dataset.push({
      source: chartModel.trendLinesModel.dataset as OptionSourceData,
      dimensions: [
        X_AXIS_DATA_KEY,
        ...(chartModel.trendLinesModel.seriesModels?.map(
          (series) => series.dataKey,
        ) ?? []),
      ],
    });
  }

  return dataset;
};

type Axes = ReturnType<typeof buildAxes>;

type NonCategoryYAxisOption = Exclude<YAXisOption, { type?: "category" }>;
const isNonCategoryYAxisOption = (
  axis: YAXisOption,
): axis is NonCategoryYAxisOption => axis.type !== "category";

export const ensureRoomForLabels = (
  axes: Axes,
  { leftAxisModel, rightAxisModel }: CartesianChartModel,
  chartLayout: ChartLayout,
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
      const { bounds } = chartLayout;
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

export function buildGridAndSeriesOption(
  chartModel: BaseCartesianChartModel,
  chartLayout: ChartLayout,
  timelineEventsModel: TimelineEventsModel | null,
  selectedTimelineEventsIds: TimelineEventId[],
  settings: ComputedVisualizationSettings,
  renderingContext: RenderingContext,
  dataSeriesOptions: EChartsSeriesOption[],
) {
  const visibleSeries = chartModel.seriesModels.filter(
    (series) => series.visible,
  );
  const panelCount = visibleSeries.length;
  const isSplitPanels = chartLayout.panelHeight != null;

  const baseGoalSeriesOption = getGoalLineSeriesOption(
    getGoalLineParams(chartModel),
    settings,
    renderingContext,
  );

  const goalSeriesOption = isSplitPanels
    ? buildSplitPanelGoalSeries(baseGoalSeriesOption, panelCount)
    : baseGoalSeriesOption;

  const trendSeriesOption = isSplitPanels
    ? remapTrendLinesToPanels(chartModel, visibleSeries)
    : getTrendLinesOption(chartModel);

  const splitPanelYExtent = isSplitPanels
    ? getSplitPanelTimelineEventsYExtent(chartLayout, panelCount)
    : undefined;

  const timelineEventsSeries =
    timelineEventsModel != null
      ? getTimelineEventsSeries(
          timelineEventsModel,
          selectedTimelineEventsIds,
          renderingContext,
          splitPanelYExtent,
        )
      : null;

  const seriesOption = [
    dataSeriesOptions,
    goalSeriesOption,
    trendSeriesOption,
    isSplitPanels && timelineEventsSeries
      ? {
          ...timelineEventsSeries,
          xAxisIndex: panelCount - 1,
          yAxisIndex: panelCount - 1,
        }
      : timelineEventsSeries,
  ].flatMap((option) => option ?? []);

  const grid: GridOption | GridOption[] = isSplitPanels
    ? buildSplitPanelGrid(chartLayout, panelCount)
    : { ...chartLayout.padding, outerBoundsMode: "none" };

  const splitPanelOverrides = isSplitPanels
    ? buildSplitPanelOverrides(
        chartModel,
        chartLayout,
        panelCount,
        renderingContext,
      )
    : {};

  return {
    grid,
    seriesOption,
    splitPanelOverrides,
  };
}

export const getCartesianChartOption = (
  chartModel: CartesianChartModel,
  chartLayout: ChartLayout,
  timelineEventsModel: TimelineEventsModel | null,
  selectedTimelineEventsIds: TimelineEventId[],
  settings: ComputedVisualizationSettings,
  chartWidth: number,
  isAnimated: boolean,
  renderingContext: RenderingContext,
): EChartsCoreOption => {
  const hasTimelineEvents = timelineEventsModel != null;
  const isSplitPanels = chartLayout.panelHeight != null;

  const dataSeriesOptions = buildEChartsSeries(
    chartModel,
    settings,
    chartWidth,
    chartLayout,
    renderingContext,
  );

  const { grid, seriesOption, splitPanelOverrides } = buildGridAndSeriesOption(
    chartModel,
    chartLayout,
    timelineEventsModel,
    selectedTimelineEventsIds,
    settings,
    renderingContext,
    dataSeriesOptions,
  );

  const visibleSeries = chartModel.seriesModels.filter(
    (series) => series.visible,
  );
  const panelCount = visibleSeries.length;

  let xAxis: XAXisOption | XAXisOption[];
  let yAxis: YAXisOption[];

  if (isSplitPanels) {
    const baseXAxis = buildDimensionAxis(
      chartModel,
      settings,
      chartLayout,
      hasTimelineEvents,
      renderingContext,
    );

<<<<<<< HEAD
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
=======
    const seriesSettingsByDataKey = getDisplaySeriesSettingsByDataKey(
      chartModel.seriesModels,
      chartModel.stackModels,
      settings,
    );
    const hasAnyBarSeries = visibleSeries.some(
      (series) => seriesSettingsByDataKey[series.dataKey]?.display === "bar",
    );
    if (hasAnyBarSeries) {
      (baseXAxis as Record<string, unknown>).boundaryGap = true;
    }

    xAxis = buildPerPanelXAxes(baseXAxis, panelCount, renderingContext);
    yAxis = buildPerPanelYAxes(
      chartModel,
      chartLayout,
      settings,
      renderingContext,
    );
  } else {
    const axes = ensureRoomForLabels(
>>>>>>> master
      buildAxes(
        chartModel,
        chartLayout,
        settings,
        hasTimelineEvents,
        renderingContext,
      ),
      chartModel,
      chartLayout,
      dataSeriesOptions,
<<<<<<< HEAD
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
=======
    );
    xAxis = axes.xAxis;
    yAxis = axes.yAxis;
  }

  return {
    ...getSharedEChartsOptions(isAnimated, renderingContext),
    ...splitPanelOverrides,
    grid,
    xAxis,
    yAxis,
    dataset: buildEChartsDataset(chartModel),
    series: seriesOption,
>>>>>>> master
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

export function buildSplitPanelGrid(
  chartLayout: ChartLayout,
  panelCount: number,
): GridOption[] {
  return Array.from({ length: panelCount }, (_, index) => ({
    left: chartLayout.padding.left,
    right: chartLayout.padding.right,
    top:
      chartLayout.padding.top +
      index * ((chartLayout.panelHeight ?? 0) + chartLayout.panelGap),
    height: chartLayout.panelHeight ?? 0,
  }));
}

export function buildSplitPanelOverrides(
  chartModel: BaseCartesianChartModel,
  chartLayout: ChartLayout,
  panelCount: number,
  renderingContext: RenderingContext,
) {
  return {
    brush: {
      toolbox: ["lineX" as const],
      xAxisIndex: Array.from({ length: panelCount }, (_, index) => index),
      throttleType: "debounce" as const,
      throttleDelay: 200,
      brushStyle: {
        color: "transparent",
        borderColor: "transparent",
        borderWidth: 0,
      },
    },
    graphic: buildSplitPanelYAxisLabel(
      chartModel,
      chartLayout,
      panelCount,
      renderingContext,
    ),
  };
}

export function buildBrushMirrorGraphics(
  grids: GridOption[],
  range: number[],
  renderingContext: RenderingContext,
) {
  const [xStart, xEnd] = range;
  const { fill, borderColor, borderWidth } = getBrushStyle(renderingContext);

  return grids.flatMap((grid, index) => {
    const top = Number(grid.top ?? 0);
    const height = Number(grid.height ?? 0);
    return [
      {
        type: "rect" as const,
        id: `brush-mirror-fill-${index}`,
        shape: { x: xStart, y: top, width: xEnd - xStart, height },
        style: { fill, stroke: "transparent" },
        z: Z_INDEXES.brushMirror,
        silent: true,
      },
      {
        type: "line" as const,
        id: `brush-mirror-left-${index}`,
        shape: { x1: xStart, y1: top, x2: xStart, y2: top + height },
        style: { stroke: borderColor, lineWidth: borderWidth },
        z: Z_INDEXES.brushMirror,
        silent: true,
      },
      {
        type: "line" as const,
        id: `brush-mirror-right-${index}`,
        shape: { x1: xEnd, y1: top, x2: xEnd, y2: top + height },
        style: { stroke: borderColor, lineWidth: borderWidth },
        z: Z_INDEXES.brushMirror,
        silent: true,
      },
    ];
  });
}

export function buildClearBrushMirrorGraphics(panelCount: number) {
  return Array.from({ length: panelCount }, (_, index) => [
    {
      type: "rect" as const,
      id: `brush-mirror-fill-${index}`,
      $action: "remove" as const,
    },
    {
      type: "line" as const,
      id: `brush-mirror-left-${index}`,
      $action: "remove" as const,
    },
    {
      type: "line" as const,
      id: `brush-mirror-right-${index}`,
      $action: "remove" as const,
    },
  ]).flat();
}

export function buildSplitPanelGoalSeries(
  baseGoalSeriesOption: EChartsSeriesOption | null,
  panelCount: number,
): EChartsSeriesOption[] {
  if (!baseGoalSeriesOption) {
    return [];
  }

  return Array.from({ length: panelCount }, (_, index) => ({
    ...baseGoalSeriesOption,
    id: `${baseGoalSeriesOption.id}_${index}`,
    xAxisIndex: index,
    yAxisIndex: index,
  }));
}

export function getSplitPanelTimelineEventsYExtent(
  chartLayout: ChartLayout,
  panelCount: number,
): SplitPanelYExtent {
  const panelHeight = chartLayout.panelHeight ?? 0;
  return {
    topY: chartLayout.padding.top,
    bottomY:
      chartLayout.padding.top +
      (panelCount - 1) * (panelHeight + chartLayout.panelGap) +
      panelHeight,
  };
}

export function buildSplitPanelYAxisLabel(
  chartModel: BaseCartesianChartModel,
  chartLayout: ChartLayout,
  panelCount: number,
  renderingContext: RenderingContext,
): unknown[] {
  const label = chartModel.leftAxisModel?.label;
  if (!label) {
    return [];
  }

  const panelHeight = chartLayout.panelHeight ?? 0;
  const totalPanelsHeight =
    panelCount * panelHeight + (panelCount - 1) * chartLayout.panelGap;
  const { fontSize } = renderingContext.theme.cartesian.label;

  return [
    {
      type: "text",
      x: CHART_STYLE.padding.x + fontSize / 2,
      y: chartLayout.padding.top + totalPanelsHeight / 2,
      style: {
        text: label,
        fill: renderingContext.getColor("text-primary"),
        fontSize,
        fontWeight: CHART_STYLE.axisName.weight,
        fontFamily: renderingContext.fontFamily,
        textAlign: "center",
        textVerticalAlign: "middle",
      },
      rotation: Math.PI / 2,
    },
  ];
}

export function buildPerPanelYAxes(
  chartModel: BaseCartesianChartModel,
  chartLayout: ChartLayout,
  settings: ComputedVisualizationSettings,
  renderingContext: RenderingContext,
): YAXisOption[] {
  const yTicksWidth = chartLayout.ticksDimensions.yTicksWidthLeft;
  const panelAxisModels = chartModel.splitPanelYAxisModels ?? [];

  return panelAxisModels.map((axisModel, index) => {
    return {
      ...buildMetricAxis(
        axisModel,
        chartModel.yAxisScaleTransforms,
        yTicksWidth - CHART_STYLE.axisTicksMarginY,
        settings,
        "left",
        true,
        renderingContext,
      ),
      gridIndex: index,
    };
  });
}

export function buildPerPanelXAxes(
  baseXAxis: XAXisOption,
  panelCount: number,
  renderingContext: RenderingContext,
): XAXisOption[] {
  return Array.from({ length: panelCount }, (_, index) => {
    if (index === panelCount - 1) {
      return { ...baseXAxis, gridIndex: index };
    }

    return {
      ...baseXAxis,
      gridIndex: index,
      axisLabel: { show: false },
      axisTick: { show: false },
      name: undefined,
      nameGap: 0,
      axisLine: {
        show: true,
        lineStyle: { color: renderingContext.getColor("border-strong") },
      },
    };
  });
}

export function remapTrendLinesToPanels(
  chartModel: BaseCartesianChartModel,
  visibleSeries: SeriesModel[],
): EChartsSeriesOption[] {
  const trendSeriesOptions = getTrendLinesOption(chartModel);

  return trendSeriesOptions.map((trendSeries, index) => {
    const sourceDataKey =
      chartModel.trendLinesModel?.seriesModels[index]?.sourceDataKey;
    if (sourceDataKey) {
      const panelIndex = visibleSeries.findIndex(
        (series) => series.dataKey === sourceDataKey,
      );
      if (panelIndex >= 0) {
        return {
          ...trendSeries,
          xAxisIndex: panelIndex,
          yAxisIndex: panelIndex,
        };
      }
    }
    return trendSeries;
  });
}
