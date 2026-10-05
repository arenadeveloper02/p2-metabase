import { getPivotTotalsVisibility } from "./pivot-options";

describe("getPivotTotalsVisibility", () => {
  it("uses legacy show_column_totals for both when split keys are absent", () => {
    expect(
      getPivotTotalsVisibility({ "pivot.show_column_totals": false }),
    ).toEqual({ showSubtotals: false, showGrandTotals: false });

    expect(getPivotTotalsVisibility({})).toEqual({
      showSubtotals: true,
      showGrandTotals: true,
    });
  });

  it("keeps split keys independent and falls back missing side to legacy", () => {
    expect(
      getPivotTotalsVisibility({
        "pivot.show_subtotals": true,
        "pivot.show_grand_totals": false,
      }),
    ).toEqual({ showSubtotals: true, showGrandTotals: false });

    expect(
      getPivotTotalsVisibility({
        "pivot.show_subtotals": true,
        "pivot.show_column_totals": false,
      }),
    ).toEqual({ showSubtotals: true, showGrandTotals: false });
  });
});
