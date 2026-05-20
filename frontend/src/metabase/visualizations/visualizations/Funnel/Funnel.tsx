import cx from "classnames";
import React, { useMemo, useRef } from "react";
import { t } from "ttag";
import _ from "underscore";

import CS from "metabase/css/core/index.css";
<<<<<<< HEAD
import { getColorsForValues } from "metabase/lib/colors/charts";
import { formatNullable } from "metabase/lib/formatting/nullable";
=======
import { formatNullable } from "metabase/utils/formatting/nullable";
>>>>>>> master
import ChartCaption from "metabase/visualizations/components/ChartCaption";
import { ResponsiveEChartsRenderer } from "metabase/visualizations/components/EChartsRenderer";
import { TransformedVisualization } from "metabase/visualizations/components/TransformedVisualization";
import { ChartSettingOrderedSimple } from "metabase/visualizations/components/settings/ChartSettingOrderedSimple";
import { getFunnelChartOption } from "metabase/visualizations/echarts/funnel/option";
import { useBrowserRenderingContext } from "metabase/visualizations/hooks/use-browser-rendering-context";
import { groupRawSeriesMetrics } from "metabase/visualizations/lib/dataset";
import {
  ChartSettingsError,
  MinRowsError,
} from "metabase/visualizations/lib/errors";
import { columnSettings } from "metabase/visualizations/lib/settings/column";
import {
  dimensionSetting,
  metricSetting,
} from "metabase/visualizations/lib/settings/utils";
import {
  getDefaultSize,
  getMinSize,
} from "metabase/visualizations/shared/utils/sizes";
import type {
  ComputedVisualizationSettings,
  VisualizationDefinition,
  VisualizationProps,
} from "metabase/visualizations/types";
import { BarChart } from "metabase/visualizations/visualizations/BarChart";
import { funnelToBarTransform } from "metabase/visualizations/visualizations/Funnel/funnel-bar-transform";
import {
  type DatasetData,
  type RawSeries,
  type RowValue,
  getRowsForStableKeys,
} from "metabase-types/api";

import { FunnelNormal } from "../../components/FunnelNormal";

import type { FunnelRow } from "./types";

const getUniqueFunnelRows = (rows: FunnelRow[]) => {
  return [...new Map(rows.map((row) => [row.key, row])).values()];
};

const FunnelViz: VisualizationDefinition = {
  getUiName: () => t`Funnel`,
  identifier: "funnel",
  iconName: "funnel",
  noHeader: true,
  minSize: getMinSize("funnel"),
  supportsVisualizer: true,
  defaultSize: getDefaultSize("funnel"),
  isSensible({ cols }: DatasetData) {
    return cols.length === 2;
  },
  checkRenderable: (
    series: RawSeries,
    settings: ComputedVisualizationSettings,
  ) => {
    const [
      {
        data: { rows },
      },
    ] = series;
    if (series.length > 1) {
      return;
    }

    if (rows.length < 1) {
      throw new MinRowsError(rows.length);
    }
    if (!settings["funnel.dimension"] || !settings["funnel.metric"]) {
      throw new ChartSettingsError(
        t`Which fields do you want to use?`,
        { section: t`Data` },
        t`Choose fields`,
      );
    }
  },

  hasEmptyState: true,

  settings: {
<<<<<<< HEAD
    ...columnSettings(),
=======
    ...columnSettings({ getHidden: () => true }),
>>>>>>> master
    ...dimensionSetting("funnel.dimension", {
      getSection: () => t`Data`,
      // eslint-disable-next-line ttag/no-module-declaration -- see metabase#5504
      title: t`Column with steps`,
      dashboard: false,
      useRawSeries: true,
      showColumnSetting: true,
      getWrapperStyle: () => ({
        marginBottom: "0.625rem",
      }),
    }),
    "funnel.order_dimension": {
      getValue: (_series: RawSeries, settings: ComputedVisualizationSettings) =>
        settings["funnel.dimension"],
      readDependencies: ["funnel.rows"],
    },
    "funnel.rows": {
      getSection: () => t`Data`,
      widget: ChartSettingOrderedSimple,
      getValue: (
        rawSeries: RawSeries,
        settings: ComputedVisualizationSettings,
      ) => {
        const { cols } = rawSeries[0].data;
        const dimensionIndex = cols.findIndex(
          (col) => col.name === settings["funnel.dimension"],
        );
        const orderDimension = settings["funnel.order_dimension"];
        const dimension = settings["funnel.dimension"];

        const rowsOrder = settings["funnel.rows"];
        const rowsForKeys = getRowsForStableKeys(rawSeries[0].data);
        const rowsKeys = rowsForKeys.map((row) =>
          formatNullable(row[dimensionIndex]),
        );

        const getDefault = (keys: RowValue[], existingRows?: any[]) => {
          // Generate colors for the keys
          const colorMapping =
            existingRows?.reduce(
              (acc, row) => {
                if (row.color) {
                  acc[row.key] = row.color;
                }
                return acc;
              },
              {} as Record<string, string>,
            ) || {};

          const colors = getColorsForValues(keys.map(String), colorMapping);

          return keys.map((key) => ({
            key,
            name: key,
            enabled: true,
            color: colors[String(key)],
          }));
        };
        if (
          !rowsOrder ||
          !_.isArray(rowsOrder) ||
          !rowsOrder.every((setting) => setting.key !== undefined) ||
          orderDimension !== dimension
        ) {
          return getUniqueFunnelRows(getDefault(rowsKeys, rowsOrder));
        }

        const removeMissingOrder = (keys: RowValue[], order: any) =>
          order.filter((o: any) => keys.includes(o.key));
        const newKeys = (keys: RowValue[], order: any) =>
          keys.filter((key) => !order.find((o: any) => o.key === key));

        const funnelRows = [
          ...removeMissingOrder(rowsKeys, rowsOrder),
          ...getDefault(newKeys(rowsKeys, rowsOrder), rowsOrder),
        ];

        return getUniqueFunnelRows(funnelRows);
      },
<<<<<<< HEAD
      getProps: (
        _object: RawSeries,
        computedSettings: ComputedVisualizationSettings,
        _onChange: (value: any) => void,
        _extra: any,
        onChangeSettings: (
          settings: Partial<ComputedVisualizationSettings>,
        ) => void,
      ) => {
        const funnelRows = computedSettings["funnel.rows"] as any[];

        return {
          hasEditSettings: true,
          onChangeSeriesColor: (seriesKey: string, color: string) => {
            if (funnelRows) {
              onChangeSettings({
                "funnel.rows": funnelRows.map((row) => {
                  if (row.key !== seriesKey) {
                    return row;
                  }
                  return { ...row, color };
                }),
              });
            }
          },
        };
      },
=======
      getProps: () => ({
        hasEditSettings: false,
      }),
>>>>>>> master
      getHidden: (series: RawSeries, settings: ComputedVisualizationSettings) =>
        settings["funnel.dimension"] === null ||
        settings["funnel.metric"] === null,
      writeDependencies: ["funnel.order_dimension"],
      dataTestId: "funnel-row-sort",
    },
    ...metricSetting("funnel.metric", {
      getSection: () => t`Data`,

      // eslint-disable-next-line ttag/no-module-declaration -- see metabase#5504
      title: t`Measure`,

      dashboard: false,
      useRawSeries: true,
      showColumnSetting: true,
    }),
    "funnel.type": {
      // eslint-disable-next-line ttag/no-module-declaration -- see metabase#5504
      title: t`Funnel type`,

      getSection: () => t`Display`,

      widget: "select",
      getProps: () => ({
        options: [
          { name: t`Funnel`, value: "funnel" },
<<<<<<< HEAD
          // eslint-disable-next-line ttag/no-module-declaration -- see metabase#5504
          { name: t`Funnel (Vertical)`, value: "echarts" },
          // eslint-disable-next-line ttag/no-module-declaration -- see metabase#5504
=======
>>>>>>> master
          { name: t`Bar chart`, value: "bar" },
        ],
      }),
      // legacy "bar" funnel was only previously available via multiseries
      getDefault: (series: RawSeries) => (series.length > 1 ? "bar" : "funnel"),
      useRawSeries: true,
    },
    "funnel.values_below_labels": {
      get section() {
        return t`Display`;
      },
      get title() {
        return t`Show values below labels`;
      },
      widget: "toggle",
      getDefault: () => false,
      inline: true,
      getHidden: (series: RawSeries, settings: ComputedVisualizationSettings) =>
        settings["funnel.type"] !== "echarts",
    },
  },
};

Object.assign(Funnel, FunnelViz);

export function Funnel(props: VisualizationProps) {
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

  // Create event handlers for vertical funnel (must be at top level for React hooks)
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
        eventName: "click",
        handler: (params: any) => {
          if (params.componentType === "series") {
            const sliceName = params.name;

            // Find the row that matches this funnel segment
            const dataRow = rows.find(
              (row: any) => String(row[dimensionIndex]) === String(sliceName),
            );

            if (dataRow && props.onVisualizationClick) {
              const dimensionCol = cols[dimensionIndex];
              const metricCol = cols[metricIndex];

              // Build the click object matching FunnelNormal format
              const clickObject = {
                value: dataRow[metricIndex], // The metric value
                column: metricCol, // The metric column
                dimensions: [
                  {
                    value: dataRow[dimensionIndex],
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
<<<<<<< HEAD
    (!isVisualizerViz || React.Children.count(titleMenuItems) === 1);
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
            settings={settings}
            icon={headerIcon}
            getHref={getHref}
            actionButtons={actionButtons}
            onChangeCardAndRun={onChangeCardAndRun}
          />
        )}
        <ResponsiveEChartsRenderer
          option={option}
          eventHandlers={echartsEventHandlers}
        />
      </div>
    );
  }
=======
    (!isVisualizerCard || React.Children.count(titleMenuItems) === 1);
>>>>>>> master

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
