import { t } from "ttag";

import {
  getDefaultSize,
  getMinSize,
} from "metabase/visualizations/shared/utils/sizes";
import { CartesianChart } from "metabase/visualizations/visualizations/CartesianChart";
import {
  COMBO_CHARTS_SETTINGS_DEFINITIONS,
  getCartesianChartDefinition,
} from "metabase/visualizations/visualizations/CartesianChart/chart-definition";

import type {
  VisualizationProps,
  VisualizationSettingsDefinitions,
} from "../../types";

Object.assign(
  BarChart,
  getCartesianChartDefinition({
    getUiName: () => t`Bar`,
    identifier: "bar",
    iconName: "bar",
    // eslint-disable-next-line ttag/no-module-declaration -- see metabase#55045
    noun: t`bar chart`,
    minSize: getMinSize("bar"),
    defaultSize: getDefaultSize("bar"),
    /* eslint-disable ttag/no-module-declaration -- see metabase#55045 */
    settings: {
      ...COMBO_CHARTS_SETTINGS_DEFINITIONS,
      "bar.data_zoom_enabled": {
        section: t`Display`,
        title: t`Enable zoom controls`,
        widget: "toggle",
        default: false,
        inline: true,
        marginBottom: "1rem",
      },
      "bar.modern_design": {
        section: t`Display`,
        title: t`Gradient`,
        widget: "toggle",
        default: false,
        inline: true,
        marginBottom: "1rem",
      },
    } as any as VisualizationSettingsDefinitions,
    /* eslint-enable ttag/no-module-declaration */
  }),
);

export function BarChart(props: VisualizationProps) {
  return <CartesianChart {...props} />;
}
