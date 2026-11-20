import {
  createMockColumn,
  createMockDatasetData,
  createMockNumericColumn,
  createMockSingleSeries,
} from "metabase-types/api/mocks";

import { funnelToBarTransform } from "./funnel-bar-transform";

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

describe("funnelToBarTransform", () => {
  it("uses a renamed step as the bar series name and color key", () => {
    const barSeries = funnelToBarTransform(rawSeries, {
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
    });

    expect(barSeries.map(({ card }) => card.name)).toEqual([
      "Landed",
      "Purchased",
    ]);
    expect(barSeries[0].card.visualization_settings.series_settings).toEqual({
      Landed: { color: "#111111" },
    });
  });
});
