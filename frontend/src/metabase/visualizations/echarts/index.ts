import {
  BarChart,
  CustomChart,
  FunnelChart,
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
} from "echarts/components";
import { use } from "echarts/core";
import { LabelLayout } from "echarts/features";
import { SVGRenderer } from "echarts/renderers";

export const registerEChartsModules = () => {
  use([
    LineChart,
    BarChart,
    ScatterChart,
    CustomChart,
    SunburstChart,
    FunnelChart,
    PieChart,
    GraphicComponent,
    GridComponent,
    LegendComponent,
    PolarComponent,
    SVGRenderer,
    MarkLineComponent,
    DataZoomComponent,
    ToolboxComponent,
    BrushComponent,
    DatasetComponent,
    SankeyChart,
    LabelLayout,
    TooltipComponent,
  ]);
};
