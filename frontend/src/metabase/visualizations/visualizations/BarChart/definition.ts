import { t } from "ttag";

import {
  getDefaultSize,
  getMinSize,
} from "metabase/visualizations/shared/utils/sizes";
import {
  COMBO_CHARTS_SETTINGS_DEFINITIONS,
  getCartesianChartDefinition,
} from "metabase/visualizations/visualizations/CartesianChart/definition";

import type { VisualizationDefinition } from "../../types";

const BarViz: Omit<VisualizationDefinition, "isSensible" | "checkRenderable"> =
  {
    getUiName: () => t`Bar`,
    identifier: "bar",
    iconName: "bar",
    // eslint-disable-next-line ttag/no-module-declaration -- see metabase#55045
    noun: t`bar chart`,
    minSize: getMinSize("bar"),
    defaultSize: getDefaultSize("bar"),
    settings: {
      ...COMBO_CHARTS_SETTINGS_DEFINITIONS,
      "bar.data_zoom_enabled": {
        getSection: () => t`Display`,
        get title() {
          return t`Enable zoom controls`;
        },
        widget: "toggle",
        default: false,
        inline: true,
        getWrapperStyle: () => ({
          marginBottom: "1rem",
        }),
      },
      "bar.modern_design": {
        getSection: () => t`Display`,
        get title() {
          return t`Gradient`;
        },
        widget: "toggle",
        default: false,
        inline: true,
        getWrapperStyle: () => ({
          marginBottom: "1rem",
        }),
      },
    },
  };

export const BAR_CHART_DEFINITION = getCartesianChartDefinition(BarViz);
