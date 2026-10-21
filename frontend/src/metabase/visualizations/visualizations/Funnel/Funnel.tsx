import cx from "classnames";
import React, { useMemo, useRef } from "react";

import CS from "metabase/css/core/index.css";
import ChartCaption from "metabase/visualizations/components/ChartCaption";
import { ResponsiveEChartsRenderer } from "metabase/visualizations/components/EChartsRenderer";
import { TransformedVisualization } from "metabase/visualizations/components/TransformedVisualization";
import { getFunnelChartOption } from "metabase/visualizations/echarts/funnel/option";
import { useBrowserRenderingContext } from "metabase/visualizations/hooks/use-browser-rendering-context";
import type { VisualizationProps } from "metabase/visualizations/types";
import { BarChart } from "metabase/visualizations/visualizations/BarChart";
import { funnelToBarTransform } from "metabase/visualizations/visualizations/Funnel/funnel-bar-transform";
import { groupRawSeriesMetrics } from "metabase/viz-core";

import { FunnelNormal } from "../../components/FunnelNormal";

import { FUNNEL_CHART_DEFINITION } from "./definition";

function FunnelComponent(props: VisualizationProps) {
  const {
    headerIcon,
    settings,
    showTitle,
    isVisualizerCard,
    actionButtons,
    className,
    onChangeCardAndRun,
    rawSeries,
    visualizerRawSeries,
    fontFamily,
    getHref,
    isDashboard,
    isEditing,
    titleMenuItems,
  } = props;
  const hasTitle = showTitle && settings["card.title"];

  const groupedRawSeries = groupRawSeriesMetrics(
    rawSeries,
    settings["funnel.dimension"],
  );

  const renderingContext = useBrowserRenderingContext({ fontFamily });
  const containerRef = useRef<HTMLDivElement>(null);

  const echartsEventHandlers = useMemo(() => {
    const [
      {
        data: { cols, rows },
      },
    ] = groupedRawSeries;

    const dimensionIndex = cols.findIndex(
      (col) => col.name === settings["funnel.dimension"],
    );
    const metricIndex = cols.findIndex(
      (col) => col.name === settings["funnel.metric"],
    );

    return [
      {
        eventName: "click" as const,
        handler: (params: {
          componentType?: string;
          name?: string;
          event?: { event?: MouseEvent };
        }) => {
          if (params.componentType !== "series") {
            return;
          }

          const dataRow = rows.find(
            (row) => String(row[dimensionIndex]) === String(params.name),
          );

          if (dataRow && props.onVisualizationClick) {
            const clickObject = {
              value: dataRow[metricIndex],
              column: cols[metricIndex],
              dimensions: [
                {
                  value: dataRow[dimensionIndex],
                  column: cols[dimensionIndex],
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
        },
      },
    ];
  }, [groupedRawSeries, settings, props]);

  if (settings["funnel.type"] === "bar") {
    return (
      <TransformedVisualization
        originalProps={{ ...props, rawSeries: groupedRawSeries }}
        VisualizationComponent={BarChart}
        transformSeries={funnelToBarTransform}
        renderingContext={renderingContext}
      />
    );
  }

  // We can't navigate a user to a particular card from a visualizer viz,
  // so title selection is disabled in this case
  const canSelectTitle =
    !!onChangeCardAndRun &&
    (!isVisualizerCard || React.Children.count(titleMenuItems) === 1);

  if (settings["funnel.type"] === "echarts") {
    const option = getFunnelChartOption(
      groupedRawSeries,
      settings,
      containerRef,
    );

    return (
      <div
        ref={containerRef}
        className={cx(className, CS.flex, CS.flexColumn, CS.p1)}
      >
        {hasTitle && (
          <ChartCaption
            series={groupedRawSeries}
            visualizerRawSeries={visualizerRawSeries}
            settings={settings}
            icon={headerIcon}
            getHref={canSelectTitle ? getHref : undefined}
            actionButtons={actionButtons}
            hasInfoTooltip={!isDashboard || !isEditing}
            onChangeCardAndRun={canSelectTitle ? onChangeCardAndRun : undefined}
            titleMenuItems={titleMenuItems}
          />
        )}
        <ResponsiveEChartsRenderer
          option={option}
          eventHandlers={echartsEventHandlers}
        />
      </div>
    );
  }

  return (
    <div className={cx(className, CS.flex, CS.flexColumn, CS.p1)}>
      {hasTitle && (
        <ChartCaption
          series={groupedRawSeries}
          visualizerRawSeries={visualizerRawSeries}
          settings={settings}
          icon={headerIcon}
          getHref={canSelectTitle ? getHref : undefined}
          actionButtons={actionButtons}
          hasInfoTooltip={!isDashboard || !isEditing}
          onChangeCardAndRun={canSelectTitle ? onChangeCardAndRun : undefined}
          titleMenuItems={titleMenuItems}
        />
      )}
      <FunnelNormal
        {...props}
        rawSeries={groupedRawSeries}
        className={CS.flexFull}
      />
    </div>
  );
}

export const Funnel = Object.assign(FunnelComponent, FUNNEL_CHART_DEFINITION);
