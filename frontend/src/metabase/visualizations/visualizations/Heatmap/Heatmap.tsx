import cx from "classnames";
import { useMemo } from "react";
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
  VisualizationProps,
} from "metabase/visualizations/types";
import type { DatasetData, RawSeries } from "metabase-types/api";

Object.assign(Heatmap, {
  uiName: t`Heatmap`,
  identifier: "heatmap",
  iconName: "heatmap",
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
      throw new MinColumnsError(3, cols.length);
    }

    if (rows.length < 1) {
      throw new MinRowsError(1, rows.length);
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
      section: t`Data`,
      title: t`X-axis`,
      dashboard: false,
      useRawSeries: true,
      showColumnSetting: false,
    }),
    ...dimensionSetting("heatmap.yDimension", {
      section: t`Data`,
      title: t`Y-axis`,
      dashboard: false,
      useRawSeries: true,
      showColumnSetting: false,
    }),
    ...metricSetting("heatmap.value", {
      section: t`Data`,
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

  placeholderSeries: [
    {
      card: {
        display: "heatmap",
        visualization_settings: {
          "heatmap.xDimension": "Hour",
          "heatmap.yDimension": "Day",
          "heatmap.value": "Count",
        },
        dataset_query: { type: "null" },
      },
      data: {
        rows: [
          ["12a", "Saturday", 5],
          ["1a", "Saturday", 1],
          ["2a", "Saturday", 0],
          ["12a", "Friday", 7],
          ["1a", "Friday", 0],
          ["2a", "Friday", 0],
          ["12a", "Thursday", 1],
          ["1a", "Thursday", 1],
          ["2a", "Thursday", 0],
          ["12a", "Wednesday", 7],
          ["1a", "Wednesday", 3],
          ["2a", "Wednesday", 0],
        ],
        cols: [
          {
            name: "Hour",
            display_name: "Hour",
            base_type: "type/Text",
            effective_type: "type/Text",
            semantic_type: null,
            source: "breakout",
          },
          {
            name: "Day",
            display_name: "Day",
            base_type: "type/Text",
            effective_type: "type/Text",
            semantic_type: null,
            source: "breakout",
          },
          {
            name: "Count",
            display_name: "Count",
            base_type: "type/Integer",
            effective_type: "type/Integer",
            semantic_type: "type/Quantity",
            source: "aggregation",
          },
        ],
      },
    },
  ],
});

export function Heatmap(props: VisualizationProps) {
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

  const option = useMemo(
    () => getHeatmapChartOption(rawSeries, settings),
    [rawSeries, settings],
  );

  return (
    <div className={cx(className, CS.flex, CS.flexColumn, CS.p1)}>
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
