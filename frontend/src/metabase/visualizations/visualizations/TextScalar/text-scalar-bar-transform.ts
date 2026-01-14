import { formatValue } from "metabase/lib/formatting";
import type { TransformSeries } from "metabase/visualizations/components/TransformedVisualization";

export const textScalarToBarTransform: TransformSeries = (rawSeries, settings) => {
  const [series] = rawSeries;
  const {
    card,
    data: { cols, rows, native_form },
  } = series;

  const dimensionIndex = cols.findIndex(
    (col) => col.name === settings["textscalar.field"],
  );

  const orderedRows = rows;

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
          "graph.dimensions": [settings["textscalar.field"]],
          "graph.metrics": [name],
          "graph.y_axis.auto_split": false,
          "legend.is_reversed": false,
        },
      },
      data: {
        rows: [[row[dimensionIndex]]],
        cols: [cols[dimensionIndex]],
        native_form,
        rows_truncated: 0,
        results_metadata: { columns: [] },
      },
    };
  });
};

