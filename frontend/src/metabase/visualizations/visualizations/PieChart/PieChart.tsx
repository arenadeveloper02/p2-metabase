import type { EChartsType } from "echarts/core";
import {
  type MouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSet } from "react-use";

import { color } from "metabase/lib/colors";
import { isNotNull } from "metabase/lib/types";
import { extractRemappings } from "metabase/visualizations";
import { ChartWithLegend } from "metabase/visualizations/components/ChartWithLegend";
import { ResponsiveEChartsRenderer } from "metabase/visualizations/components/EChartsRenderer";
import { getPieChartFormatters } from "metabase/visualizations/echarts/pie/format";
import { getPieChartModel } from "metabase/visualizations/echarts/pie/model";
import { getPieChartOption } from "metabase/visualizations/echarts/pie/option";
import { getTooltipOption } from "metabase/visualizations/echarts/pie/tooltip";
import { getArrayFromMapValues } from "metabase/visualizations/echarts/pie/util";
import {
  getDonutChartData,
  getDoughnutChartOption,
} from "metabase/visualizations/echarts/pie-doughnut/option";
import {
  useInjectSeriesColorsClasses,
  usePieChartValuesColorsClasses,
} from "metabase/visualizations/echarts/tooltip";
import { useBrowserRenderingContext } from "metabase/visualizations/hooks/use-browser-rendering-context";
import type { VisualizationProps } from "metabase/visualizations/types";

import S from "./PieChart.module.css";
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
    isDocument,
    isFullscreen,
  } = props;
  const hoveredIndex = props.hovered?.index;
  const hoveredSliceKeyPath = props.hovered?.pieSliceKeyPath;

  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<EChartsType>();
  const [chartSize, setChartSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

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
    () => extractRemappings(rawSeries) || [],
    [rawSeries],
  );
  const seriesToRender = useMemo(
    () => extractRemappings(rawSeries),
    [rawSeries],
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
    () => {
      if (settings["pie.type"] === "donut-classic") {
        return {};
      }
      return {
        ...getPieChartOption(
          chartModel,
          formatters,
          settings,
          renderingContext,
          Math.min(chartSize.width, chartSize.height),
          hoveredIndex,
          hoveredSliceKeyPath,
        ),
        tooltip: getTooltipOption(chartModel, formatters, containerRef),
      };
    },
    [
      chartModel,
      formatters,
      settings,
      renderingContext,
      chartSize,
      hoveredIndex,
      hoveredSliceKeyPath,
    ],
  );

  const valuesColorsCss = usePieChartValuesColorsClasses(chartModel);

  // Inject colors for Classic Donut (derived from settings) for tooltip usage
  const classicColors = useMemo(() => {
    const rows = settings["pie.rows"] || [];
    // Ensure we only have valid hex strings
    return rows
      .map((r: any) => r.color)
      .filter((c: any) => typeof c === "string" && c.startsWith("#"));
  }, [settings]);
  const classicColorsCss = useInjectSeriesColorsClasses(classicColors);

  const handleInit = useCallback((chart: EChartsType) => {
    chartRef.current = chart;
  }, []);

  const handleResize = useCallback(
    (width: number, height: number) => setChartSize({ width, height }),
    [],
  );

  // We pass undefined for classic donut to avoid mismatches in slice tree indices
  // since classic donut has its own aggregation logic (20 slice limit etc).
  // This disables standard hook-based legend highlighting for classic donut, preventing crashes.
  const eventHandlers = useChartEvents(
      props, 
      chartRef, 
      settings["pie.type"] === "donut-classic" ? undefined : chartModel
  );

  const slices = useMemo(
    () => getArrayFromMapValues(chartModel.sliceTree),
    [chartModel.sliceTree],
  );
  const legendTitles = useMemo(
    () =>
      slices
        .filter((s) => s.includeInLegend)
        .map((s) => {
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
    .filter((s) => s.includeInLegend)
    .map((s, index) => (hiddenSlices.has(s.key) ? index : null))
    .filter(isNotNull);

  const legendColors = slices
    .filter((s) => s.includeInLegend)
    .map((s) => s.color);

  const showLegend = settings["pie.show_legend"];

  const onHoverChange = useCallback(
    (hoverData: any) =>
      props.onHoverChange(
        hoverData && {
          ...hoverData,
          pieLegendHoverIndex: hoverData.index,
        },
      ),
    [props],
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

  const donutData = useMemo(() => {
    if (
      settings["pie.type"] !== "donut-classic" ||
      !rawSeriesWithRemappings ||
      rawSeriesWithRemappings.length === 0
    ) {
      return null;
    }
    return getDonutChartData(rawSeriesWithRemappings, settings, hiddenSlices);
  }, [rawSeriesWithRemappings, settings, hiddenSlices]);

  // Calculate Full Data (ignoring hidden state) for the Legend List
  // This ensures Legend shows the "Top 20" structure even if some are hidden.
  const fullDonutData = useMemo(() => {
    if (settings["pie.type"] !== "donut-classic" || !rawSeriesWithRemappings) {
      return null;
    }
    return getDonutChartData(rawSeriesWithRemappings, settings, new Set());
  }, [rawSeriesWithRemappings, settings]);

  const doughnutOption = useMemo(() => {
    if (!donutData) {
      return null;
    }

    const hoveredIndex = props.hovered?.pieLegendHoverIndex;
    const hoveredName =
      hoveredIndex != null ? fullDonutData?.data[hoveredIndex]?.name : undefined;

    return getDoughnutChartOption(
      donutData,
      settings,
      chartSize.width,
      chartSize.height,
      containerRef,
      hoveredName,
      renderingContext,
    );
  }, [
    donutData,
    settings,
    chartSize,
    props.hovered,
    fullDonutData,
    renderingContext,
  ]);


  // Create event handlers for classic doughnut
  const doughnutEventHandlers = useMemo(() => {
    const pieRows = settings["pie.rows"] || [];

    return [
      {
        eventName: "click",
        handler: (params: any) => {
          // Ensure we only handle clicks on series items
          if (params.componentType !== "series") {
            return;
          }

            const sliceName = params.name;
            const pieRow = pieRows.find(
              (r: any) => r.name === sliceName || r.key === sliceName,
            );

            if (
              pieRow &&
              props.onVisualizationClick &&
              rawSeriesWithRemappings &&
              rawSeriesWithRemappings.length > 0
            ) {
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
        },
      },
      {
        eventName: "mouseover",
        handler: (params: any) => {
          if (params.componentType === "series" && fullDonutData) {
            const index = fullDonutData.data.findIndex(d => d.name === params.name);
            if (index !== -1) {
              onHoverChange({
                index,
                element: params.event?.event?.target,
              });
            }
          }
        },
      },
      {
        eventName: "mouseout",
        handler: () => {
          onHoverChange(null);
        },
      },
    ];
  }, [settings, rawSeriesWithRemappings, props, fullDonutData, onHoverChange]);


  const classicLegendItems = useMemo(() => {
    if (!fullDonutData) {
      return [[], [], []];
    }

    const { data, total } = fullDonutData;
    const titles: string[][] = [];
    const colors: string[] = [];
    const hiddenIndices: number[] = [];

    const showPercentInLegend =
      settings["pie.percent_visibility"] === "legend" ||
      settings["pie.percent_visibility"] === "both";

    data.forEach((slice, i) => {
      const name = slice.name;
      const sliceColor = slice.itemStyle?.color || color("text-light");

      colors.push(sliceColor);

      if (hiddenSlices.has(slice.name)) {
        hiddenIndices.push(i);
      }

      const titleParts = [name];
      if (showPercentInLegend) {
        const pct = total > 0 ? slice.value / total : 0;
        const decimals = settings["pie.decimal_places"] ?? 2;
        titleParts.push((pct * 100).toFixed(decimals) + "%");
      }
      titles.push(titleParts);
    });

    return [titles, colors, hiddenIndices];
  }, [fullDonutData, settings, hiddenSlices]);

  // Handle Legend Hover Highlighting for Classic Donut
  // Since we disabled useChartEvents, we handle this manually using chartRef
  useEffect(() => {
    if (settings["pie.type"] !== "donut-classic") {
      return;
    }
    const hoverIndex = props.hovered?.pieLegendHoverIndex;
    const chart = chartRef.current;

    if (!chart || !fullDonutData) {
      return;
    }

    if (hoverIndex != null) {
      const sliceName = fullDonutData.data[hoverIndex]?.name;
      if (sliceName) {
        chart.dispatchAction({
          type: "highlight",
          name: sliceName,
        });
        return () => {
          chart.dispatchAction({
            type: "downplay",
            name: sliceName,
          });
        };
      }
    }
  }, [props.hovered?.pieLegendHoverIndex, settings, fullDonutData]);

  // Render classic doughnut if selected
  if (settings["pie.type"] === "donut-classic") {
    if (!doughnutOption) {
      return null;
    }
    const [titles, donutLegendColors, hiddenIndices] = classicLegendItems as [
      string[][],
      string[],
      number[],
    ];
    return (
      <ChartWithLegend
        key="donut-classic"
        legendTitles={titles}
        legendHiddenIndices={hiddenIndices}
        legendColors={donutLegendColors}
        showLegend={showLegend}
        onHoverChange={onHoverChange}
        className={props.className}
        chartClassName={S.PieChartContainer}
        gridSize={props.gridSize}
        legendPosition={settings["pie.legend_position"]}
        aspectRatio={1.2}
        hovered={props.hovered}
        isDashboard={isDashboard}
        onToggleSeriesVisibility={(_e, index) => {
          if (fullDonutData && index < fullDonutData.data.length) {
            const key = fullDonutData.data[index].name;
            toggleSliceVisibility(key);
          }
        }}
        isDocument={isDocument}
      >
        <ResponsiveEChartsRenderer
          option={doughnutOption}
          onInit={handleInit}
          onResize={handleResize}
          eventHandlers={doughnutEventHandlers}
          ref={containerRef}
          notMerge={false}
        />
        {classicColorsCss} 
        </ChartWithLegend>
       );
  }

  return (
    <ChartWithLegend
      key="standard-pie"
      legendTitles={legendTitles}
      legendHiddenIndices={hiddenSlicesLegendIndices}
      legendColors={legendColors}
      showLegend={showLegend}
      onHoverChange={onHoverChange}
      className={props.className}
      chartClassName={S.PieChartContainer}
      gridSize={props.gridSize}
      hovered={props.hovered}
      isDashboard={isDashboard}
      onToggleSeriesVisibility={handleToggleSeriesVisibility}
      isDocument={isDocument}
      legendPosition={settings["pie.legend_position"]}
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
