import { formatValue } from "metabase/lib/formatting";
import { formatNullable } from "metabase/lib/formatting/nullable";
import { isNotNull } from "metabase/lib/types";
import type { TransformSeries } from "metabase/visualizations/components/TransformedVisualization";
import type { RowValue } from "metabase-types/api";

export const funnelToBarTransform: TransformSeries = (rawSeries, settings) => {
  const [series] = rawSeries;
  const {
    card,
    data: { cols, rows, native_form },
  } = series;

  const dimensionIndex = cols.findIndex(
    (col) => col.name === settings["funnel.dimension"],
  );
  const metricIndex = cols.findIndex(
    (col) => col.name === settings["funnel.metric"],
  );

  const rowByFormattedKey = rows.reduce((acc, row) => {
    acc.set(String(formatNullable(row[dimensionIndex])), row);
    return acc;
  }, new Map<string, RowValue[]>());

  const rowsOrder = settings["funnel.rows"] as any[];

  const seriesSettings: Record<string, { color: string }> = {};
  if (Array.isArray(rowsOrder)) {
    rowsOrder.forEach((o) => {
      const dataRow = rowByFormattedKey.get(String(o.key));
      if (dataRow && o.color) {
        const name = String(
          formatValue(dataRow[dimensionIndex], {
            column: cols[dimensionIndex],
          }),
        );
        seriesSettings[name] = { color: o.color };
      }
    });
  }

  const orderedRows =
    Array.isArray(rowsOrder) && rowsOrder.length > 0
      ? rowsOrder
          .map((rowOrder) =>
            rowOrder.enabled
              ? rowByFormattedKey.get(String(rowOrder.key))
              : null,
          )
          .filter(isNotNull)
      : rows;

  return orderedRows.map((row) => {
    const name = String(
      formatValue(row[dimensionIndex], {
        column: cols[dimensionIndex],
      }),
    );
    return {
      card: {
        ...card,
        name,
        display: "bar",
        visualization_settings: {
          "card.title": settings["card.title"] || card.name,
          "graph.tooltip_type": "default",
          "stackable.stack_type": "stacked" as const,
          "graph.dimensions": [settings["funnel.dimension"]],
          "graph.metrics": [name],
          "graph.y_axis.auto_split": false,
          "graph.y_axis.title_text": cols[metricIndex].display_name,
          "legend.is_reversed": false,
          series_settings: seriesSettings,
        },
      },
      data: {
        rows: [[row[dimensionIndex], row[metricIndex]]],
        cols: [
          cols[dimensionIndex],
          {
            ...cols[metricIndex],
            name,
          },
        ],
        native_form,
        rows_truncated: 0,
        results_metadata: { columns: [] },
      },
    };
  });
};
