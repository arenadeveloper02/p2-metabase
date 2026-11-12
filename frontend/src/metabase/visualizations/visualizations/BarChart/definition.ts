import { t } from "ttag";

import {
  COMBO_CHARTS_SETTINGS_DEFINITIONS,
  getCartesianChartDefinition,
} from "metabase/visualizations/visualizations/CartesianChart/definition";
import {
  type VisualizationDefinition,
  getDefaultSize,
  getMinSize,
} from "metabase/viz-core";

const BarViz: Omit<VisualizationDefinition, "isSensible" | "checkRenderable"> =
  {
    getUiName: () => t`Bar`,
    identifier: "bar",
    iconName: "bar",
    get noun() {
      return t`bar chart`;
    },
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
