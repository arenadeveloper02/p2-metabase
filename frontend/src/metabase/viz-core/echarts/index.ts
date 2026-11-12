import {
  BarChart,
  BoxplotChart,
  CustomChart,
  FunnelChart,
  GaugeChart,
  HeatmapChart,
  LineChart,
  PieChart,
  SankeyChart,
  ScatterChart,
  SunburstChart,
  TreemapChart,
} from "echarts/charts";
import {
  BrushComponent,
  DataZoomComponent,
  DatasetComponent,
  GraphicComponent,
  GridComponent,
  LegendComponent,
  MarkLineComponent,
  PolarComponent,
  ToolboxComponent,
  TooltipComponent,
  VisualMapComponent,
} from "echarts/components";
import { use } from "echarts/core";
import { LabelLayout } from "echarts/features";
import { SVGRenderer } from "echarts/renderers";

import { DataVisibilityExtension } from "./data-visibility";

export const registerEChartsModules = () => {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  use([
    LineChart,
    BarChart,
    BoxplotChart,
    ScatterChart,
    CustomChart,
    SunburstChart,
    FunnelChart,
    PieChart,
    HeatmapChart,
    GaugeChart,
    GraphicComponent,
    GridComponent,
    LegendComponent,
    PolarComponent,
    VisualMapComponent,
    SVGRenderer,
    MarkLineComponent,
    DataZoomComponent,
    ToolboxComponent,
    BrushComponent,
    DatasetComponent,
    SankeyChart,
    TreemapChart,
    LabelLayout,
    TooltipComponent,
    DataVisibilityExtension,
  ]);
};
