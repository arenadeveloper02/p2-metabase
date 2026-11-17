import { checkNotNull } from "metabase/utils/types";
import { createMockSingleSeries } from "metabase-types/api/mocks";

import { FUNNEL_CHART_DEFINITION } from "./definition";

describe("FUNNEL_CHART_DEFINITION legend.position", () => {
  const getHidden = checkNotNull(
    FUNNEL_CHART_DEFINITION.settings?.["legend.position"]?.getHidden,
  );
  const series = [createMockSingleSeries({ display: "funnel" })];

  it("should offer the setting on the bar funnel, which has a legend", () => {
    expect(getHidden(series, { "funnel.type": "bar" })).toBe(false);
  });

  it("should hide the setting on the classic funnel, which has no legend", () => {
    expect(getHidden(series, { "funnel.type": "funnel" })).toBe(true);
  });
});

describe("FUNNEL_CHART_DEFINITION series_settings", () => {
  it("renames the selected funnel step", () => {
    const getProps = checkNotNull(
      FUNNEL_CHART_DEFINITION.settings?.series_settings?.getProps,
    );
    const rows = [
      { key: "Visited", name: "Visited", enabled: true },
      { key: "Purchased", name: "Purchased", enabled: true },
    ];
    const onChangeSettings = jest.fn();
    const props = getProps(
      [],
      { "funnel.rows": rows },
      jest.fn(),
      undefined,
      onChangeSettings,
    );

    props.updateRowName("Landed", "Visited");

    expect(onChangeSettings).toHaveBeenCalledWith({
      "funnel.rows": [
        { key: "Visited", name: "Landed", enabled: true },
        { key: "Purchased", name: "Purchased", enabled: true },
      ],
    });
  });
});
