import type { EChartsType } from "echarts/core";
import { type MouseEvent, useCallback, useMemo, useRef, useState } from "react";
import { useSet } from "react-use";

import { isNotNull } from "metabase/lib/types";
import { extractRemappings } from "metabase/visualizations";
import ChartWithLegend from "metabase/visualizations/components/ChartWithLegend";
import { ResponsiveEChartsRenderer } from "metabase/visualizations/components/EChartsRenderer";
import { getPieChartFormatters } from "metabase/visualizations/echarts/pie/format";
import { getPieChartModel } from "metabase/visualizations/echarts/pie/model";
import { getPieChartOption } from "metabase/visualizations/echarts/pie/option";
import { getTooltipOption } from "metabase/visualizations/echarts/pie/tooltip";
import { getArrayFromMapValues } from "metabase/visualizations/echarts/pie/util";
import { getDoughnutChartOption } from "metabase/visualizations/echarts/pie-doughnut/option";
import {
  useCloseTooltipOnScroll,
  usePieChartValuesColorsClasses,
} from "metabase/visualizations/echarts/tooltip";
import { useBrowserRenderingContext } from "metabase/visualizations/hooks/use-browser-rendering-context";
import type { VisualizationProps } from "metabase/visualizations/types";

import { PIE_CHART_DEFINITION } from "./chart-definition";
import { useChartEvents } from "./use-chart-events";

Object.assign(PieChart, PIE_CHART_DEFINITION);

export function PieChart(props: VisualizationProps) {
  const {
    fontFamily,
    rawSeries,
    settings,
    onRender,
    isDashboard,
    isFullscreen,
    isPlaceholder,
    series: transformedSeries,
  } = props;
  const hoveredIndex = props.hovered?.index;
  const hoveredSliceKeyPath = props.hovered?.pieSliceKeyPath;

  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<EChartsType>();
  const [sideLength, setSideLength] = useState(0);

  const [hiddenSlices, { toggle: toggleSliceVisibility }] = useSet<
    string | number
  >();

  const showWarning = useCallback(
    (warning: string) => onRender({ warnings: [warning] }),
    [onRender],
  );

  const renderingContext = useBrowserRenderingContext({
    fontFamily,
    isDashboard,
    isFullscreen,
  });
  const rawSeriesWithRemappings = useMemo(
    () => extractRemappings(rawSeries),
    [rawSeries],
  );

  const seriesToRender = useMemo(
    () => (isPlaceholder ? transformedSeries : rawSeriesWithRemappings),
    [isPlaceholder, transformedSeries, rawSeriesWithRemappings],
  );

  const chartModel = useMemo(
    () =>
      getPieChartModel(
        seriesToRender,
        settings,
        Array.from(hiddenSlices),
        renderingContext,
        showWarning,
      ),
    [seriesToRender, settings, hiddenSlices, renderingContext, showWarning],
  );
  const formatters = useMemo(
    () => getPieChartFormatters(chartModel, settings),
    [chartModel, settings],
  );
  const option = useMemo(
    () => ({
      ...getPieChartOption(
        chartModel,
        formatters,
        settings,
        renderingContext,
        sideLength,
        hoveredIndex,
        hoveredSliceKeyPath,
      ),
      tooltip: getTooltipOption(chartModel, formatters, containerRef),
    }),
    [
      chartModel,
      formatters,
      settings,
      renderingContext,
      sideLength,
      hoveredIndex,
      hoveredSliceKeyPath,
    ],
  );

  const valuesColorsCss = usePieChartValuesColorsClasses(chartModel);

  const handleInit = useCallback((chart: EChartsType) => {
    chartRef.current = chart;
  }, []);

  const handleResize = useCallback(
    (width: number, height: number) => setSideLength(Math.min(width, height)),
    [],
  );

  const eventHandlers = useChartEvents(props, chartRef, chartModel);

  const slices = useMemo(
    () => getArrayFromMapValues(chartModel.sliceTree),
    [chartModel.sliceTree],
  );
  const legendTitles = useMemo(
    () =>
      slices
        .filter(s => s.includeInLegend)
        .map(s => {
          const label = s.name;

          // Hidden slices don't have a percentage
          const sliceHidden = s.normalizedPercentage === 0;
          const percentDisabled =
            settings["pie.percent_visibility"] !== "legend" &&
            settings["pie.percent_visibility"] !== "both";

          if (sliceHidden || percentDisabled) {
            return [label];
          }

          return [
            label,
            formatters.formatPercent(s.normalizedPercentage, "legend"),
          ];
        }),
    [formatters, settings, slices],
  );

  const hiddenSlicesLegendIndices = slices
    .filter(s => s.includeInLegend)
    .map((s, index) => (hiddenSlices.has(s.key) ? index : null))
    .filter(isNotNull);

  const legendColors = slices.filter(s => s.includeInLegend).map(s => s.color);

  const showLegend = settings["pie.show_legend"];

  const onHoverChange = (hoverData: any) =>
    props.onHoverChange(
      hoverData && {
        ...hoverData,
        pieLegendHoverIndex: hoverData.index,
      },
    );

  const handleToggleSeriesVisibility = (
    _event: MouseEvent,
    sliceIndex: number,
  ) => {
    const slice = slices[sliceIndex];
    const willShowSlice = hiddenSlices.has(slice.key);
    const hasMoreVisibleSlices = slices.length - hiddenSlices.size > 1;
    if (hasMoreVisibleSlices || willShowSlice) {
      toggleSliceVisibility(slice.key);
    }
  };

  const doughnutOption = useMemo(
    () => getDoughnutChartOption(rawSeriesWithRemappings, settings),
    [rawSeriesWithRemappings, settings],
  );

  // Create event handlers for classic doughnut
  const doughnutEventHandlers = useMemo(() => {
    const pieRows = settings["pie.rows"] || [];

    return [
      {
        eventName: "click",
        handler: (params: any) => {
          if (params.componentType === "series") {
            const sliceName = params.name;
            const pieRow = pieRows.find(
              (r: any) => r.name === sliceName || r.key === sliceName,
            );

            if (pieRow && props.onVisualizationClick) {
              const [
                {
                  data: { cols, rows },
                },
              ] = rawSeriesWithRemappings;
              const dimensionSetting = settings["pie.dimension"];
              const dimensionName = Array.isArray(dimensionSetting)
                ? dimensionSetting[0]
                : dimensionSetting;
              const metricSetting = settings["pie.metric"];
              const metricName = Array.isArray(metricSetting)
                ? metricSetting[0]
                : metricSetting;

              const dimensionCol = cols.find(
                (c: any) => c.name === dimensionName,
              );
              const metricCol = cols.find((c: any) => c.name === metricName);
              const dimensionIndex = cols.findIndex(
                (c: any) => c.name === dimensionName,
              );

              // Find the row that matches this slice
              const dataRow = rows.find(
                (row: any) =>
                  String(row[dimensionIndex]) === String(pieRow.key),
              );

              if (dimensionCol && metricCol && dataRow) {
                // Build the full data array with all columns, matching the format
                // used by the regular pie chart
                const data = dataRow.map((value: any, index: number) => ({
                  value,
                  col: cols[index],
                }));

                // Build the click object matching the regular pie chart format
                const clickObject = {
                  value: params.value, // The metric value
                  column: metricCol, // The metric column
                  data, // Full row data with all columns
                  dimensions: [
                    {
                      value: pieRow.key,
                      column: dimensionCol,
                    },
                  ],
                  settings,
                  event: params.event?.event,
                };

                // Check if it's clickable and trigger the handler
                if (
                  !props.visualizationIsClickable ||
                  props.visualizationIsClickable(clickObject)
                ) {
                  props.onVisualizationClick(clickObject);
                }
              }
            }
          }
        },
      },
    ];
  }, [settings, rawSeriesWithRemappings, props]);

  useCloseTooltipOnScroll(chartRef);

  // Render classic doughnut if selected
  if (settings["pie.type"] === "donut-classic") {
    return (
      <div style={{ width: "100%", height: "100%" }}>
        <ResponsiveEChartsRenderer
          option={doughnutOption}
          onInit={handleInit}
          onResize={handleResize}
          eventHandlers={doughnutEventHandlers}
        />
      </div>
    );
  }

  return (
    <ChartWithLegend
      legendTitles={legendTitles}
      legendHiddenIndices={hiddenSlicesLegendIndices}
      legendColors={legendColors}
      showLegend={showLegend}
      onHoverChange={onHoverChange}
      className={props.className}
      gridSize={props.gridSize}
      hovered={props.hovered}
      isDashboard={isDashboard}
      onToggleSeriesVisibility={handleToggleSeriesVisibility}
    >
      <ResponsiveEChartsRenderer
        ref={containerRef}
        option={option}
        onInit={handleInit}
        onResize={handleResize}
        eventHandlers={eventHandlers}
        // By default this is `true` for other charts, however for the pie chart
        // we need it to be `false`, otherwise echarts will bug out and be stuck
        // in emphasis state after hovering a slice
        notMerge={false}
      />
      {valuesColorsCss}
    </ChartWithLegend>
  );
}
