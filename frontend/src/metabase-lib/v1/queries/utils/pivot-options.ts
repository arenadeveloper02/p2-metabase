import _ from "underscore";

import { isNotNull } from "metabase/utils/types";
import * as Lib from "metabase-lib";
import type Question from "metabase-lib/v1/Question";
import type {
  ColumnNameColumnSplitSetting,
  FieldRefColumnSplitSetting,
  PivotTableColumnSplitSetting,
  VisualizationSettings,
} from "metabase-types/api";

import { isColumnNameColumnSplitSetting } from "./pivot";

type PivotOptions = {
  pivot_rows: number[];
  pivot_cols: number[];
  show_row_totals?: boolean;
  show_subtotals?: boolean;
  show_grand_totals?: boolean;
  /** @deprecated Prefer show_subtotals / show_grand_totals. Kept for older backends. */
  show_column_totals?: boolean;
};

export function getPivotTotalsVisibility(
  settings: Pick<
    VisualizationSettings,
    | "pivot.show_subtotals"
    | "pivot.show_grand_totals"
    | "pivot.show_column_totals"
  >,
): { showSubtotals: boolean; showGrandTotals: boolean } {
  const hasSubtotals = settings["pivot.show_subtotals"] !== undefined;
  const hasGrandTotals = settings["pivot.show_grand_totals"] !== undefined;
  const legacy = settings["pivot.show_column_totals"] ?? true;

  if (!hasSubtotals && !hasGrandTotals) {
    return { showSubtotals: legacy, showGrandTotals: legacy };
  }

  return {
    showSubtotals: hasSubtotals
      ? (settings["pivot.show_subtotals"] ?? true)
      : legacy,
    showGrandTotals: hasGrandTotals
      ? (settings["pivot.show_grand_totals"] ?? true)
      : legacy,
  };
}

function getColumnNamePivotOptions(
  query: Lib.Query,
  stageIndex: number,
  setting: ColumnNameColumnSplitSetting,
): Pick<PivotOptions, "pivot_rows" | "pivot_cols"> {
  const returnedColumns = Lib.returnedColumns(query, stageIndex);
  const breakoutColumnNames = returnedColumns
    .map((column) => Lib.displayInfo(query, stageIndex, column))
    .filter((columnInfo) => columnInfo.isBreakout)
    .map((columnInfo) => columnInfo.name);

  const { rows, columns } = _.mapObject(setting, (columnNames) => {
    return columnNames
      .map((columnName) => breakoutColumnNames.indexOf(columnName))
      .filter((columnIndex) => columnIndex >= 0);
  });

  return { pivot_rows: rows ?? [], pivot_cols: columns ?? [] };
}

function getFieldRefPivotOptions(
  query: Lib.Query,
  stageIndex: number,
  setting: FieldRefColumnSplitSetting,
): Pick<PivotOptions, "pivot_rows" | "pivot_cols"> {
  const returnedColumns = Lib.returnedColumns(query, stageIndex);
  const breakoutColumns = returnedColumns.filter(
    (column) => Lib.displayInfo(query, stageIndex, column).isBreakout,
  );

  const { rows, columns } = _.mapObject(setting, (fieldRefs) => {
    if (breakoutColumns.length === 0) {
      return [];
    }

    const nonEmptyFieldRefs = fieldRefs.filter(isNotNull);
    const breakoutIndexes = Lib.findColumnIndexesFromLegacyRefs(
      query,
      stageIndex,
      breakoutColumns,
      nonEmptyFieldRefs,
    );
    return breakoutIndexes.filter((breakoutIndex) => breakoutIndex >= 0);
  });

  return { pivot_rows: rows ?? [], pivot_cols: columns ?? [] };
}

export function getPivotOptions(question: Question): PivotOptions {
  const query = question.query();
  const stageIndex = -1;
  const setting: PivotTableColumnSplitSetting =
    question.setting("pivot_table.column_split") ?? {};

  const showRowTotals = question.setting("pivot.show_row_totals") ?? true;
  const { showSubtotals, showGrandTotals } = getPivotTotalsVisibility({
    "pivot.show_subtotals": question.setting("pivot.show_subtotals"),
    "pivot.show_grand_totals": question.setting("pivot.show_grand_totals"),
    "pivot.show_column_totals": question.setting("pivot.show_column_totals"),
  });

  const pivotSplitOptions = isColumnNameColumnSplitSetting(setting)
    ? getColumnNamePivotOptions(query, stageIndex, setting)
    : getFieldRefPivotOptions(query, stageIndex, setting);

  return {
    ...pivotSplitOptions,
    show_row_totals: showRowTotals,
    show_subtotals: showSubtotals,
    show_grand_totals: showGrandTotals,
    // Legacy combined flag for older backends / export middleware.
    show_column_totals: showSubtotals && showGrandTotals,
  };
}
