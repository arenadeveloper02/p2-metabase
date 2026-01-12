import { Component } from "react";
import { t } from "ttag";
import _ from "underscore";

import DashboardS from "metabase/css/dashboard.module.css";
import { color } from "metabase/lib/colors";
import { formatValue } from "metabase/lib/formatting";
import { TransformedVisualization } from "metabase/visualizations/components/TransformedVisualization";
import { columnSettings } from "metabase/visualizations/lib/settings/column";
import { fieldSetting } from "metabase/visualizations/lib/settings/utils";
import {
  getDefaultSize,
  getMinSize,
} from "metabase/visualizations/shared/utils/sizes";
import type {
  ComputedVisualizationSettings,
  VisualizationPassThroughProps,
  VisualizationProps,
} from "metabase/visualizations/types";
import { BarChart } from "metabase/visualizations/visualizations/BarChart";
import type { DatasetColumn, DatasetData } from "metabase-types/api/dataset";

import { TextScalarContainer, TextScalarRoot } from "./TextScalar.styled";
import { textScalarToBarTransform } from "./text-scalar-bar-transform";

// TextScalar visualization shows a single text value
// Multiseries TextScalar is transformed to a Bar chart
export class TextScalar extends Component<
  VisualizationProps & VisualizationPassThroughProps
> {
  static getUiName = () => t`Text`;
  static identifier = "textscalar";
  static iconName = "string";
  static canSavePng = false;

  static minSize = getMinSize("scalar");
  static defaultSize = getDefaultSize("scalar");

  static isSensible({ cols, rows }: DatasetData) {
    return rows.length === 1 && cols.length === 1;
  }

  static checkRenderable() {
    // text scalar can always be rendered, nothing needed here
  }

  static settings = {
    ...fieldSetting("textscalar.field", {
      get title() {
        return t`Field to show`;
      },
      getDefault: ([
        {
          data: { cols },
        },
      ]: any) => cols[0]?.name,
      getHidden: ([
        {
          data: { cols },
        },
      ]) => cols.length < 2,
      getProps: (series: any, settings: any, onChange: any) => {
        // Get default props from fieldSetting (options, columns, etc.)
        const [
          {
            data: { cols },
          },
        ] = series;

        // Create default options and columns (matching fieldSetting's default getProps)
        const defaultProps = {
          options: cols.map((col: any) => ({
            name: col.display_name,
            value: col.name,
          })),
          columns: cols,
        };

        // Merge with custom onChange that also updates text value
        return {
          ...defaultProps,
          onChange: (newFieldName: string) => {
            // Update the field - text will be auto-formatted on render
            onChange(newFieldName);
          },
        };
      },
    }),
    ...columnSettings({
      getColumns: (
        [
          {
            data: { cols },
          },
        ],
        settings,
      ) => [
        _.find(cols, (col) => col.name === settings["textscalar.field"]) ||
          cols[0],
      ],
      readDependencies: ["textscalar.field"],
    }),
    "textscalar.color": {
      get title() {
        return t`Text color`;
      },
      get section() {
        return t`Display`;
      },
      widget: "color",
      getDefault: () => undefined, // Inherits default text color (same as Scalar)
      getProps: () => {
        // Add all text colors (excluding white/whitish), black, and grey shades to the color picker
        const textColors = [
          color("black"),
          color("text-brand"),
          color("text-dark"),
          color("text-disabled"),
          color("text-hover"),
          color("text-light"),
          color("text-medium"),
          color("text-medium-opaque"),
          color("text-primary"),
          color("text-secondary"),
          color("text-selected"),
          color("text-tertiary"),
          color("text-inverse"),
          color("bg-black"),
        ];
        return {
          additionalColors: textColors,
        };
      },
    },
    "textscalar.hover_color": {
      get title() {
        return t`Hover color`;
      },
      get section() {
        return t`Display`;
      },
      widget: "color",
      getDefault: () => color("brand"), // Default to brand color (bluish) - same as Scalar
      getProps: () => {
        // Include brand color and other colors available in palette
        const hoverColors = [
          color("brand"), // Default bluish hover color
          color("black"),
          color("text-brand"),
          color("text-dark"),
          color("text-disabled"),
          color("text-hover"),
          color("text-light"),
          color("text-medium"),
          color("text-medium-opaque"),
          color("text-primary"),
          color("text-secondary"),
          color("text-selected"),
          color("text-tertiary"),
          color("text-inverse"),
          color("bg-black"),
        ];
        return {
          additionalColors: hoverColors,
        };
      },
    },
    "textscalar.font_size": {
      get title() {
        return t`Font size`;
      },
      get section() {
        return t`Display`;
      },
      widget: "number",
      props: {
        placeholder: "Auto",
      },
    },
    "textscalar.font_weight": {
      get title() {
        return t`Font weight`;
      },
      get section() {
        return t`Display`;
      },
      widget: "select",
      props: {
        options: [
          { name: t`Normal`, value: "normal" },
          { name: t`Bold`, value: "bold" },
          { name: t`100`, value: "100" },
          { name: t`200`, value: "200" },
          { name: t`300`, value: "300" },
          { name: t`400`, value: "400" },
          { name: t`500`, value: "500" },
          { name: t`600`, value: "600" },
          { name: t`700`, value: "700" },
          { name: t`800`, value: "800" },
          { name: t`900`, value: "900" },
        ],
      },
      getDefault: () => "normal",
    },
    click_behavior: {},
  };

  _textScalar: HTMLElement | null = null;

  _getColumnIndex(
    cols: DatasetColumn[],
    settings: ComputedVisualizationSettings,
  ) {
    const columnIndex = _.findIndex(
      cols,
      (col) => col.name === settings["textscalar.field"],
    );
    return columnIndex < 0 ? 0 : columnIndex;
  }

  componentDidUpdate(
    prevProps: VisualizationProps & VisualizationPassThroughProps,
  ) {
    // When visualization type changes from TextScalar to another type,
    // reset column_settings to default to prevent format settings from persisting
    const { onUpdateVisualizationSettings, card } = this.props;
    const prevCard = prevProps.card;

    // Check if visualization type changed from TextScalar to something else
    if (
      onUpdateVisualizationSettings &&
      prevCard?.display === "textscalar" &&
      card?.display !== "textscalar" &&
      prevCard?.visualization_settings?.column_settings
    ) {
      // Reset column_settings when switching away from TextScalar
      onUpdateVisualizationSettings({
        column_settings: undefined,
      });
    }
  }

  render() {
    const {
      series: [
        {
          data: { cols, rows },
        },
      ],
      settings,
      visualizationIsClickable,
      onVisualizationClick,
      fontFamily,
      rawSeries,
    } = this.props;

    if (rawSeries.length > 1) {
      return (
        <TransformedVisualization
          transformSeries={textScalarToBarTransform}
          originalProps={this.props}
          VisualizationComponent={BarChart}
        />
      );
    }

    const columnIndex = this._getColumnIndex(cols, settings);
    const value = rows[0] && rows[0][columnIndex];
    const column = cols[columnIndex];

    // Format the value using the same logic as Scalar chart
    // This ensures formatting options (currency, decimals, etc.) are always applied
    const formatOptions = {
      ...settings.column?.(column),
      jsx: false, // Return string, not JSX
    };
    const formattedValue = formatValue(value, {
      column,
      ...formatOptions,
    });
    const textValue = formattedValue != null ? String(formattedValue) : "";

    const isClickable = onVisualizationClick != null;

    const handleClick = () => {
      if (this._textScalar == null) {
        return;
      }

      const clickData = {
        value: textValue,
        column,
        data: rows[0]?.map((value, index) => ({ value, col: cols[index] })),
        settings,
        element: this._textScalar,
      };

      if (
        this._textScalar &&
        onVisualizationClick &&
        visualizationIsClickable(clickData)
      ) {
        onVisualizationClick(clickData);
      }
    };

    const textColor = settings["textscalar.color"];
    const hoverColor = settings["textscalar.hover_color"];
    const fontSize = settings["textscalar.font_size"] ?? 70;
    const fontWeight = settings["textscalar.font_weight"] || "normal";

    const textStyle: React.CSSProperties = {
      color: textColor || undefined,
      fontSize: fontSize ? `${fontSize}px` : undefined,
      fontWeight,
      fontFamily: fontFamily || undefined,
    };

    return (
      <TextScalarRoot>
        <TextScalarContainer
          className={DashboardS.fullscreenNormalText}
          data-testid="textscalar-container"
          isClickable={isClickable}
          hoverColor={hoverColor}
        >
          <span
            onClick={handleClick}
            ref={(textScalar) => (this._textScalar = textScalar)}
            style={{
              ...textStyle,
              cursor: isClickable ? "pointer" : "default",
              display: "inline",
            }}
            className={isClickable ? "textscalar-hover" : undefined}
            data-hover-color={hoverColor}
          >
            {textValue}
          </span>
        </TextScalarContainer>
      </TextScalarRoot>
    );
  }
}
