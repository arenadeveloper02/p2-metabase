import type { PivotTableColumnSplitSetting } from "metabase-types/api";
import { createMockColumn } from "metabase-types/api/mocks";

import {
  CELL_PADDING,
  MIN_HEADER_CELL_WIDTH,
  ROW_TOGGLE_ICON_WIDTH,
} from "./constants";
import type { HeaderItem } from "./types";
import {
  addMissingCardBreakouts,
  getColumnValues,
  getLeftHeaderWidths,
  getValueHeaderFloors,
  getValueHeaderWidths,
  isColumnValid,
  isFormattablePivotColumn,
  updateValueWithCurrentColumns,
} from "./utils";

describe("Visualizations > Visualizations > PivotTable > utils", () => {
  const cols = [
    createMockColumn({ source: "breakout", name: "field-123" }),
    createMockColumn({ source: "breakout", name: "field-456" }),
    createMockColumn({ source: "breakout", name: "field-789" }),
    createMockColumn({ source: "aggregation", name: "aggregation-1" }),
    createMockColumn({ source: "aggregation", name: "aggregation-2" }),
  ];

  describe("isColumnValid", () => {
    it("should return true if a column is an aggregation", () => {
      const result = isColumnValid(createMockColumn({ source: "aggregation" }));
      expect(result).toBe(true);
    });

    it("should return true if a column is a breakout", () => {
      const result = isColumnValid(createMockColumn({ source: "breakout" }));
      expect(result).toBe(true);
    });

    it("should return true if a column is a pivot grouping", () => {
      const result = isColumnValid(
        createMockColumn({
          source: "fields",
          name: "pivot-grouping",
        }),
      );
      expect(result).toBe(true);
    });

    it("should return false if a column is a field", () => {
      const result = isColumnValid(createMockColumn({ source: "fields" }));
      expect(result).toBe(false);
    });
  });

  describe("isFormattablePivotColumn", () => {
    it("should return true if a column is an aggregation", () => {
      const result = isFormattablePivotColumn(
        createMockColumn({
          source: "aggregation",
        }),
      );
      expect(result).toBe(true);
    });

    it("should return false if a column is a breakout", () => {
      const result = isFormattablePivotColumn(
        createMockColumn({
          source: "breakout",
        }),
      );
      expect(result).toBe(false);
    });
  });

  describe("updateValueWithCurrentColumns", () => {
    it("should not update settings when no columns have changed", () => {
      const pivotSettings: PivotTableColumnSplitSetting = {
        columns: [cols[0].name],
        rows: [cols[1].name, cols[2].name],
        values: [cols[3].name, cols[4].name],
      };

      const result = updateValueWithCurrentColumns(pivotSettings, cols);

      expect(result).toEqual(pivotSettings);
    });

    it("should add a newly-added field to rows", () => {
      const oldPivotSettings: PivotTableColumnSplitSetting = {
        columns: [],
        rows: [cols[0].name, cols[1].name],
        values: [cols[3].name, cols[4].name],
      };

      const newPivotSettings: PivotTableColumnSplitSetting = {
        columns: [],
        rows: [
          cols[0].name,
          cols[1].name,
          cols[2].name, // <-- new column
        ],
        values: [cols[3].name, cols[4].name],
      };

      const result = updateValueWithCurrentColumns(oldPivotSettings, cols);

      expect(result).toEqual(newPivotSettings);
    });

    it("should add a newly-added aggregation to values", () => {
      const oldPivotSettings: PivotTableColumnSplitSetting = {
        columns: [],
        rows: [cols[0].name, cols[1].name, cols[2].name],
        values: [cols[3].name],
      };

      const newPivotSettings: PivotTableColumnSplitSetting = {
        columns: [],
        rows: [cols[0].name, cols[1].name, cols[2].name],
        values: [
          cols[3].name,
          cols[4].name, // <-- new aggregation
        ],
      };

      const result = updateValueWithCurrentColumns(oldPivotSettings, cols);

      expect(result).toEqual(newPivotSettings);
    });

    it("should remove a removed field from rows", () => {
      const oldPivotSettings: PivotTableColumnSplitSetting = {
        columns: [],
        rows: [cols[0].name, cols[1].name, cols[2].name, "removed_column"],
        values: [cols[3].name],
      };

      const newPivotSettings: PivotTableColumnSplitSetting = {
        columns: [],
        rows: [cols[0].name, cols[1].name, cols[2].name],
        values: [cols[3].name, cols[4].name],
      };

      const result = updateValueWithCurrentColumns(oldPivotSettings, cols);

      expect(result).toEqual(newPivotSettings);
    });

    it("should remove a removed aggregation from values", () => {
      const oldPivotSettings: PivotTableColumnSplitSetting = {
        columns: [],
        rows: [cols[0].name, cols[1].name, cols[2].name],
        values: [cols[3].name, cols[4].name, "removed_aggregation"],
      };

      const newPivotSettings: PivotTableColumnSplitSetting = {
        columns: [],
        rows: [cols[0].name, cols[1].name, cols[2].name],
        values: [cols[3].name, cols[4].name],
      };

      const result = updateValueWithCurrentColumns(oldPivotSettings, cols);

      expect(result).toEqual(newPivotSettings);
    });
  });

  describe("addMissingCardBreakouts", () => {
    it("should not mess with pivot settings that aren't misssing breakouts", () => {
      const oldPivotSettings: PivotTableColumnSplitSetting = {
        columns: [cols[0].name],
        rows: [cols[1].name, cols[2].name],
        values: [cols[3].name, cols[4].name],
      };

      const result = addMissingCardBreakouts(oldPivotSettings, cols);

      expect(result).toEqual(oldPivotSettings);
    });

    it("should add a missing breakout to pivot settings", () => {
      const oldPivotSettings: PivotTableColumnSplitSetting = {
        columns: [cols[0].name],
        rows: [cols[1].name, cols[2].name],
        values: [cols[3].name, cols[4].name],
      };

      const newColumn = createMockColumn({
        name: "new_breakout",
        source: "breakout",
      });
      const newPivotSettings: PivotTableColumnSplitSetting = {
        columns: [cols[0].name],
        rows: [cols[1].name, cols[2].name, newColumn.name],
        values: [cols[3].name, cols[4].name],
      };

      const result = addMissingCardBreakouts(oldPivotSettings, [
        ...cols,
        newColumn,
      ]);

      expect(result).toEqual(newPivotSettings);
    });
  });

  describe("getLeftHeaderWidths", () => {
    it("should return an array of widths", () => {
      const { leftHeaderWidths } = getLeftHeaderWidths({
        rowIndexes: [0, 1, 2],
        getColumnTitle: () => "test-123",
        font: {},
      });
      // jest-dom thinks all characters are 1px wide, so we get the minimum
      expect(leftHeaderWidths).toEqual([
        MIN_HEADER_CELL_WIDTH,
        MIN_HEADER_CELL_WIDTH,
        MIN_HEADER_CELL_WIDTH,
      ]);
    });

    it("should return the total of all widths", () => {
      const { totalLeftHeaderWidths } = getLeftHeaderWidths({
        rowIndexes: [0, 1, 2],
        getColumnTitle: () => "test-123",
        font: {},
      });
      expect(totalLeftHeaderWidths).toEqual(MIN_HEADER_CELL_WIDTH * 3);
    });

    it("should grow beyond the previous max width so that long headings are not truncated", () => {
      const { leftHeaderWidths } = getLeftHeaderWidths({
        rowIndexes: [0, 1, 2],
        // jest-dom thinks characters are 1px wide, so each column needs ~500px
        getColumnTitle: () => "x".repeat(500),
        font: {},
      });

      const expected = 500 + CELL_PADDING + ROW_TOGGLE_ICON_WIDTH;
      expect(leftHeaderWidths).toEqual([expected, expected, expected]);
    });

    it("should return the wider of the column header or data width", () => {
      const data = [
        { depth: 0, value: "x".repeat(150) },
        { depth: 0, value: "foo2" },
        { depth: 1, value: "bar1" },
        { depth: 1, value: "bar2" },
        { depth: 2, value: "baz1" },
        { depth: 4, value: "boo1" },
      ] as HeaderItem[];

      const { leftHeaderWidths } = getLeftHeaderWidths({
        rowIndexes: [0, 1, 2, 3, 4],
        leftHeaderItems: data,
        getColumnTitle: () => "x".repeat(70),
        font: {},
      });

      expect(leftHeaderWidths).toEqual([
        150 + CELL_PADDING,
        70 + CELL_PADDING + ROW_TOGGLE_ICON_WIDTH,
        70 + CELL_PADDING + ROW_TOGGLE_ICON_WIDTH,
        70 + CELL_PADDING + ROW_TOGGLE_ICON_WIDTH,
        70 + CELL_PADDING + ROW_TOGGLE_ICON_WIDTH,
      ]);
    });

    it("should factor in the toggle icon width for columns with subtotals", () => {
      const data = [
        { depth: 0, value: "x".repeat(100), hasSubtotal: true },
        { depth: 0, value: "foo2" },
        { depth: 1, value: "bar1" },
        { depth: 1, value: "bar2" },
        { depth: 2, value: "baz1" },
        { depth: 4, value: "boo1" },
      ] as HeaderItem[];

      const { leftHeaderWidths } = getLeftHeaderWidths({
        rowIndexes: [0, 1, 2, 3, 4],
        leftHeaderItems: data,
        getColumnTitle: () => "test-123",
        font: {},
      });

      expect(leftHeaderWidths).toEqual([
        100 + CELL_PADDING + ROW_TOGGLE_ICON_WIDTH,
        MIN_HEADER_CELL_WIDTH,
        MIN_HEADER_CELL_WIDTH,
        MIN_HEADER_CELL_WIDTH,
        MIN_HEADER_CELL_WIDTH,
      ]);
    });
  });

  describe("getValueHeaderFloors", () => {
    it("returns the per-column heading floor for span=1 items", () => {
      const items = [
        { offset: 0, span: 1, value: "x".repeat(150) },
        { offset: 1, span: 1, value: "x".repeat(20) },
      ] as HeaderItem[];

      const floors = getValueHeaderFloors({
        topHeaderItems: items,
        font: {},
      });

      expect(floors[0]).toBe(150 + CELL_PADDING);
      expect(floors[1]).toBe(MIN_HEADER_CELL_WIDTH);
    });

    it("distributes the heading floor across spanned columns", () => {
      const items = [
        { offset: 0, span: 3, value: "x".repeat(300) },
      ] as HeaderItem[];

      const floors = getValueHeaderFloors({
        topHeaderItems: items,
        font: {},
      });

      const expectedPerCol = Math.ceil((300 + CELL_PADDING) / 3);
      expect(floors[0]).toBe(expectedPerCol);
      expect(floors[1]).toBe(expectedPerCol);
      expect(floors[2]).toBe(expectedPerCol);
    });

    it("uses the larger of MIN_HEADER_CELL_WIDTH and the heading width", () => {
      const items = [
        { offset: 0, span: 1, value: "ab" },
      ] as HeaderItem[];

      const floors = getValueHeaderFloors({
        topHeaderItems: items,
        font: {},
      });

      expect(floors[0]).toBe(MIN_HEADER_CELL_WIDTH);
    });
  });

  describe("getValueHeaderWidths", () => {
    it("preserves user-resized widths when wider than the heading floor", () => {
      const items = [
        { offset: 0, span: 1, value: "x".repeat(40) },
      ] as HeaderItem[];

      const widths = getValueHeaderWidths({
        topHeaderItems: items,
        font: {},
        existingWidths: { 0: 400 },
      });

      expect(widths[0]).toBe(400);
    });

    it("clamps user-resized widths up to the heading floor", () => {
      const items = [
        { offset: 0, span: 1, value: "x".repeat(150) },
      ] as HeaderItem[];

      const widths = getValueHeaderWidths({
        topHeaderItems: items,
        font: {},
        existingWidths: { 0: 50 },
      });

      expect(widths[0]).toBe(150 + CELL_PADDING);
    });
  });

  describe("getColumnValues", () => {
    it("can collect column values from left header data", () => {
      const data = [
        { depth: 0, value: "foo1" },
        { depth: 0, value: "foo2" },
        { depth: 1, value: "bar1" },
        { depth: 1, value: "bar2" },
        { depth: 2, value: "baz1" },
        { depth: 4, value: "boo1" },
      ] as HeaderItem[];

      const result = getColumnValues(data);

      expect(result).toEqual([
        { values: ["foo1", "foo2"], hasSubtotal: false },
        { values: ["bar1", "bar2"], hasSubtotal: false },
        { values: ["baz1"], hasSubtotal: false },
        undefined, // no depth of 3
        { values: ["boo1"], hasSubtotal: false },
      ]);
    });

    it("detects columns with subtotals", () => {
      const data = [
        { depth: 0, value: "foo1", hasSubtotal: false },
        { depth: 0, value: "foo2", hasSubtotal: true },
        { depth: 1, value: "bar1", hasSubtotal: false },
        { depth: 1, value: "bar2", hasSubtotal: false },
        { depth: 2, value: "baz1", hasSubtotal: true },
      ] as HeaderItem[];

      const result = getColumnValues(data);

      expect(result).toEqual([
        { values: ["foo1", "foo2"], hasSubtotal: true },
        { values: ["bar1", "bar2"], hasSubtotal: false },
        { values: ["baz1"], hasSubtotal: true },
      ]);
    });

    it("handles null values", () => {
      const data = [
        { depth: 0, value: "foo1", hasSubtotal: false },
        { depth: 0, value: null, hasSubtotal: true },
        { depth: 1, value: "bar1", hasSubtotal: false },
        { depth: 1, value: "bar2", hasSubtotal: false },
        { depth: 2, value: "baz1", hasSubtotal: true },
      ] as HeaderItem[];

      const result = getColumnValues(data);

      expect(result).toEqual([
        { values: ["foo1", null], hasSubtotal: true },
        { values: ["bar1", "bar2"], hasSubtotal: false },
        { values: ["baz1"], hasSubtotal: true },
      ]);
    });
  });
});
