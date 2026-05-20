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
    SankeyChart,
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
    LabelLayout,
    TooltipComponent,
  ]);
};
