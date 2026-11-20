import {
  createMockColumn,
  createMockDatasetData,
  createMockNumericColumn,
  createMockSingleSeries,
} from "metabase-types/api/mocks";

import { type FunnelDataPoint, getFunnelChartOption } from "./option";

const rawSeries = [
  createMockSingleSeries(
    { display: "funnel" },
    {
      data: createMockDatasetData({
        cols: [
          createMockColumn({ name: "step", display_name: "Step" }),
          createMockNumericColumn({ name: "count", display_name: "Count" }),
        ],
        rows: [
          ["Visited", 100],
          ["Purchased", 10],
        ],
      }),
    },
  ),
];

const renderingContext = {
  fontFamily: "Lato",
  getColor: (name: string) => (name === "text-primary" ? "#111111" : "#222222"),
};

function seriesData(option: ReturnType<typeof getFunnelChartOption>) {
  const series = option.series;
  if (!Array.isArray(series)) {
    return [];
  }
  const data = series[0]?.data;
  return Array.isArray(data) ? data : [];
}

describe("getFunnelChartOption", () => {
  it("labels a renamed step and keeps its color on the step key", () => {
    const option = getFunnelChartOption(
      rawSeries,
      {
        "funnel.dimension": "step",
        "funnel.metric": "count",
        "funnel.rows": [
          {
            key: "Visited",
            name: "Landed",
            enabled: true,
            color: "#111111",
          },
          { key: "Purchased", name: "Purchased", enabled: true },
        ],
      },
      undefined,
      renderingContext,
    );

    const series = option.series;
    const labelSeries = Array.isArray(series) ? series[0] : undefined;
    expect(labelSeries && "label" in labelSeries && labelSeries.label).toEqual(
      expect.objectContaining({ color: "#111111" }),
    );
    expect(option.legend).toEqual(
      expect.objectContaining({
        textStyle: expect.objectContaining({ color: "#111111" }),
      }),
    );

    const data = seriesData(option);
    expect(data[0]).toEqual(
      expect.objectContaining<Partial<FunnelDataPoint>>({
        name: "Landed",
        stepKey: "Visited",
      }),
    );
    expect(data[1]).toEqual(
      expect.objectContaining<Partial<FunnelDataPoint>>({
        name: "Purchased",
        stepKey: "Purchased",
      }),
    );

    const visited = data[0];
    const purchased = data[1];
    if (
      visited == null ||
      purchased == null ||
      typeof visited !== "object" ||
      typeof purchased !== "object"
    ) {
      throw new Error("expected funnel data points");
    }
    expect("itemStyle" in visited && visited.itemStyle?.color).toBe("#111111");
    expect("itemStyle" in purchased && purchased.itemStyle?.color).not.toBe(
      "#111111",
    );
  });
});
