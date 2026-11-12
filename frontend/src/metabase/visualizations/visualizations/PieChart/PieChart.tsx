/* eslint-disable @typescript-eslint/no-unsafe-assignment -- FIXME: any-typed values */
import type { EChartsType } from "echarts/core";
import {
  type MouseEvent,
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { colors as themeColors } from "metabase/ui/colors";
import { isNotNull } from "metabase/utils/types";
import { ChartWithLegend } from "metabase/visualizations/components/ChartWithLegend";
import { ResponsiveEChartsRenderer } from "metabase/visualizations/components/EChartsRenderer";
import {
  getDonutChartData,
  getDoughnutChartOption,
} from "metabase/visualizations/echarts/pie-doughnut/option";
import { getTooltipOption } from "metabase/visualizations/echarts/pie/tooltip";
import { useBrowserRenderingContext } from "metabase/visualizations/hooks/use-browser-rendering-context";
import { useLegendHiddenSeries } from "metabase/visualizations/hooks/use-legend-hidden-series";
import type {
  ClickObject,
  VisualizationProps,
} from "metabase/visualizations/types";
import {
  type HoveredObject,
  extractRemappings,
  getArrayFromMapValues,
  getPieChartFormatters,
  getPieChartModel,
  getPieChartOption,
  useInjectSeriesColorsClasses,
  usePieChartValuesColorsClasses,
} from "metabase/viz-core";
import type { PieRow } from "metabase-types/api";

import S from "./PieChart.module.css";
import { PIE_CHART_DEFINITION } from "./definition";
import { useChartEvents } from "./use-chart-events";

function PieChartComponent(props: VisualizationProps) {
  const { fontFamily, rawSeries, settings, onRender, isDashboard, isDocument } =
    props;
  const hoveredIndex = props.hovered?.index;
  const hoveredSliceKeyPath = props.hovered?.pieSliceKeyPath;

  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<EChartsType | null>(null);
  const [chartSize, setChartSize] = useState<{ width: number; height: number }>(
    {
      width: 0,
      height: 0,
    },
  );

  const [hiddenSlices, toggleSliceVisibility] = useLegendHiddenSeries<
    string | number
  >(settings["legend.position"]);

  const showWarning = useCallback(
    (warning: string) => onRender({ warnings: [warning] }),
    [onRender],
  );

  const renderingContext = useBrowserRenderingContext({
    fontFamily,
    isDashboard,
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
  const option = useMemo(() => {
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
  }, [
    chartModel,
    formatters,
    settings,
    renderingContext,
    chartSize,
    hoveredIndex,
    hoveredSliceKeyPath,
  ]);

  const valuesColorsCss = usePieChartValuesColorsClasses(chartModel);

  // Inject colors for Classic Donut (derived from settings) for tooltip usage
  const classicColors = useMemo(() => {
    const rows = settings["pie.rows"] ?? [];
    return rows
      .map((row) => row.color)
      .filter((color) => color.startsWith("#"));
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
    settings["pie.type"] === "donut-classic" ? undefined : chartModel,
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

  const { onHoverChange: onHoverChangeProp } = props;
  const onHoverChange = useCallback(
    (hoverData?: HoveredObject | null) => {
      onHoverChangeProp(
        hoverData && {
          ...hoverData,
          pieLegendHoverIndex: hoverData.index,
        },
      );
    },
    [onHoverChangeProp],
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
      hoveredIndex != null
        ? fullDonutData?.data[hoveredIndex]?.name
        : undefined;

    return getDoughnutChartOption(
      donutData,
      settings,
      chartSize.width,
      chartSize.height,
      // useRef(null) is RefObject<HTMLDivElement | null>. This helper still
      // takes RefObject<HTMLDivElement>.
      containerRef as RefObject<HTMLDivElement>,
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

  type DoughnutChartEvent = {
    componentType?: string;
    name?: string;
    value?: ClickObject["value"];
    event?: { event?: globalThis.MouseEvent };
  };

  // Create event handlers for classic doughnut
  const doughnutEventHandlers = useMemo(() => {
    const pieRows: PieRow[] = settings["pie.rows"] ?? [];

    return [
      {
        eventName: "click",
        handler: (params: DoughnutChartEvent) => {
          if (params.componentType !== "series") {
            return;
          }

          const sliceName = params.name;
          const pieRow = pieRows.find(
            (row) => row.name === sliceName || row.key === sliceName,
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

            const dimensionCol = cols.find((col) => col.name === dimensionName);
            const metricCol = cols.find((col) => col.name === metricName);
            const dimensionIndex = cols.findIndex(
              (col) => col.name === dimensionName,
            );

            const dataRow = rows.find(
              (row) => String(row[dimensionIndex]) === String(pieRow.key),
            );

            if (dimensionCol && metricCol && dataRow) {
              const data = dataRow.map((value, index) => ({
                value,
                col: cols[index],
              }));

              const clickObject: ClickObject = {
                value: params.value,
                column: metricCol,
                data,
                dimensions: [
                  {
                    value: pieRow.key,
                    column: dimensionCol,
                  },
                ],
                settings,
                event: params.event?.event,
              };

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
        handler: (params: DoughnutChartEvent) => {
          if (params.componentType === "series" && fullDonutData) {
            const index = fullDonutData.data.findIndex(
              (point) => point.name === params.name,
            );
            if (index !== -1) {
              const target = params.event?.event?.target;
              onHoverChange({
                index,
                element: target instanceof Element ? target : undefined,
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

  const classicLegendItems = useMemo((): [string[][], string[], number[]] => {
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

    data.forEach((slice, index) => {
      const color = slice.itemStyle?.color ?? themeColors["text-secondary"];
      colors.push(color);

      if (hiddenSlices.has(slice.name)) {
        hiddenIndices.push(index);
      }

      const titleParts = [slice.name];
      if (showPercentInLegend) {
        const pct = total > 0 ? slice.value / total : 0;
        const decimals = settings["pie.decimal_places"] ?? 2;
        titleParts.push(`${(pct * 100).toFixed(decimals)}%`);
      }
      titles.push(titleParts);
    });

    return [titles, colors, hiddenIndices];
  }, [fullDonutData, settings, hiddenSlices]);

  // Classic donut skips useChartEvents, so legend hover is applied on the chart instance.
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
    const [titles, colors, hiddenIndices] = classicLegendItems;
    return (
      <ChartWithLegend
        key="donut-classic"
        legendTitles={titles}
        legendHiddenIndices={hiddenIndices}
        legendColors={colors}
        onHoverChange={onHoverChange}
        className={props.className}
        chartClassName={S.PieChartContainer}
        gridSize={props.gridSize}
        legendPosition={settings["legend.position"]}
        aspectRatio={1.2}
        hovered={props.hovered}
        isDashboard={isDashboard}
        onToggleSeriesVisibility={(e, index) => {
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
      legendPosition={settings["legend.position"]}
      onHoverChange={onHoverChange}
      className={props.className}
      chartClassName={S.PieChartContainer}
      gridSize={props.gridSize}
      hovered={props.hovered}
      isDashboard={isDashboard}
      onToggleSeriesVisibility={handleToggleSeriesVisibility}
      isDocument={isDocument}
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

export const PieChart = Object.assign(PieChartComponent, PIE_CHART_DEFINITION);
