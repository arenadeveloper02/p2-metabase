/* eslint-disable ttag/no-module-declaration */
import cx from "classnames";
import { useMemo, useRef } from "react";
import { t } from "ttag";

import CS from "metabase/css/core/index.css";
import ChartCaption from "metabase/visualizations/components/ChartCaption";
import { ResponsiveEChartsRenderer } from "metabase/visualizations/components/EChartsRenderer";
import { getHeatmapChartOption } from "metabase/visualizations/echarts/heatmap/option";
import {
  ChartSettingsError,
  MinColumnsError,
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
import type { DatasetData, RawSeries } from "metabase-types/api";

export const HEATMAP_CHART_DEFINITION: VisualizationDefinition = {
  getUiName: () => t`Heatmap`,
  identifier: "heatmap",
  iconName: "grid",
  noun: t`heatmap`,
  minSize: getMinSize("heatmap"),
  defaultSize: getDefaultSize("heatmap"),

  isSensible({ cols }: DatasetData) {
    return cols.length >= 3;
  },

  checkRenderable: (
    series: RawSeries,
    settings: ComputedVisualizationSettings,
  ) => {
    const [
      {
        data: { rows, cols },
      },
    ] = series;

    if (series.length > 1) {
      return;
    }

    if (cols.length < 3) {
      throw new MinColumnsError(3);
    }

    if (rows.length < 1) {
      throw new MinRowsError(rows.length);
    }

    if (
      !settings["heatmap.xDimension"] ||
      !settings["heatmap.yDimension"] ||
      !settings["heatmap.value"]
    ) {
      throw new ChartSettingsError(
        t`Which fields do you want to use?`,
        { section: t`Data` },
        t`Choose fields`,
      );
    }
  },

  settings: {
    ...columnSettings(),
    ...dimensionSetting("heatmap.xDimension", {
      getSection: () => t`Data`,
      title: t`X-axis`,
      dashboard: false,
      useRawSeries: true,
      showColumnSetting: false,
    }),
    ...dimensionSetting("heatmap.yDimension", {
      getSection: () => t`Data`,
      title: t`Y-axis`,
      dashboard: false,
      useRawSeries: true,
      showColumnSetting: false,
    }),
    ...metricSetting("heatmap.value", {
      getSection: () => t`Data`,
      title: t`Value`,
      dashboard: false,
      useRawSeries: true,
      showColumnSetting: true,
    }),
    "heatmap.showLabels": {
      title: t`Show values in cells`,
      section: t`Display`,
      widget: "toggle",
      default: true,
    },
    "heatmap.visualMapPosition": {
      title: t`Color scale position`,
      section: t`Display`,
      widget: "select",
      props: {
        options: [
          { name: t`Bottom`, value: "bottom" },
          { name: t`Top`, value: "top" },
        ],
      },
      default: "bottom",
    },
  },
};

function HeatmapComponent(props: VisualizationProps) {
  const {
    headerIcon,
    settings,
    showTitle,
    actionButtons,
    className,
    onChangeCardAndRun,
    rawSeries,
    getHref,
  } = props;

  const hasTitle = showTitle && settings["card.title"];
  const containerRef = useRef<HTMLDivElement>(null);

  const option = useMemo(
    () => getHeatmapChartOption(rawSeries, settings, containerRef),
    [rawSeries, settings],
  );

  return (
    <div
      ref={containerRef}
      className={cx(className, CS.flex, CS.flexColumn, CS.p1)}
    >
      {hasTitle && (
        <ChartCaption
          series={rawSeries}
          settings={settings}
          icon={headerIcon}
          getHref={getHref}
          actionButtons={actionButtons}
          onChangeCardAndRun={onChangeCardAndRun}
        />
      )}
      <ResponsiveEChartsRenderer option={option} />
    </div>
  );
}

export const Heatmap = Object.assign(HeatmapComponent, HEATMAP_CHART_DEFINITION);
