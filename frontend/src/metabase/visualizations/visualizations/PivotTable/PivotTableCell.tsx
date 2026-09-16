import { useDraggable } from "@dnd-kit/core";
import cx from "classnames";
import { useEffect, useId, useRef } from "react";

import { useTranslateContent } from "metabase/content-translation/hooks";
import CS from "metabase/css/core/index.css";
import { Ellipsified } from "metabase/ui";
import type { RowValue, VisualizationSettings } from "metabase-types/api";

import { PivotTableCell, ResizeHandle } from "./PivotTable.styled";
import { RowToggleIcon } from "./RowToggleIcon";
import { LEFT_HEADER_LEFT_SPACING, RESIZE_HANDLE_WIDTH } from "./constants";
import type { BodyItem, HeaderItem, PivotTableClicked } from "./types";

interface CellProps {
  value: React.ReactNode;
  style?: React.CSSProperties;
  icon?: React.ReactNode;
  backgroundColor?: string;
  isBody?: boolean;
  isBold?: boolean;
  isEmphasized?: boolean;
  isGrandTotal?: boolean;
  isBorderedHeader?: boolean;
  isTransparent?: boolean;
  hasTopBorder?: boolean;
  onClick?: ((e: React.MouseEvent) => void) | undefined;
  onResize?: (newWidth: number) => void;
  showTooltip?: boolean;
}

interface ResizableHandleProps {
  id: string;
  initialWidth: number;
  onResizeEnd: (newWidth: number) => void;
}

function ResizableHandle({
  id,
  initialWidth,
  onResizeEnd,
}: ResizableHandleProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id,
  });

  const prevTransformRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const prevTransform = prevTransformRef.current;
    prevTransformRef.current = transform;

    if (prevTransform !== null && transform === null) {
      const newWidth = Math.max(
        RESIZE_HANDLE_WIDTH,
        initialWidth + prevTransform.x,
      );
      onResizeEnd(newWidth);
    }
  }, [transform, initialWidth, onResizeEnd]);

  const currentPosition = initialWidth + (transform ? transform.x : 0);

  return (
    <ResizeHandle
      ref={setNodeRef}
      data-testid="pivot-table-resize-handle"
      style={{
        left: `${currentPosition}px`,
        cursor: "col-resize",
      }}
      {...listeners}
      {...attributes}
    />
  );
}

export function Cell({
  value,
  style,
  icon,
  backgroundColor,
  isBody = false,
  isBold,
  isEmphasized,
  isGrandTotal,
  isBorderedHeader,
  isTransparent,
  hasTopBorder,
  onClick,
  onResize,
  showTooltip = true,
}: CellProps) {
  const cellId = useId();

  return (
    <PivotTableCell
      data-allow-page-break-after
      data-testid="pivot-table-cell"
      data-is-grand-total={isGrandTotal || undefined}
      isBold={isBold}
      isEmphasized={isEmphasized}
      isGrandTotal={isGrandTotal}
      isBorderedHeader={isBorderedHeader}
      hasTopBorder={hasTopBorder}
      isTransparent={isTransparent}
      style={{
        ...style,
        ...(backgroundColor
          ? {
              backgroundColor,
            }
          : {}),
      }}
      onClick={onClick}
    >
      <>
        <div
          className={cx(CS.px1, CS.flex, CS.alignCenter, {
            [CS.justifyEnd]: isBody,
          })}
        >
          <Ellipsified showTooltip={showTooltip}>{value}</Ellipsified>
          {icon && <div className={CS.pl1}>{icon}</div>}
        </div>
        {!!onResize && (
          <ResizableHandle
            id={`resize-handle-${cellId}`}
            // Unjustified type cast. FIXME
            initialWidth={(style?.width as number) ?? 0}
            onResizeEnd={onResize}
          />
        )}
      </>
    </PivotTableCell>
  );
}

type CellClickHandler = (
  clicked: PivotTableClicked,
) => ((e: React.MouseEvent) => void) | undefined;

interface TopHeaderCellProps {
  item: HeaderItem;
  style: React.CSSProperties;
  getCellClickHandler: CellClickHandler;
  onResize?: (newWidth: number) => void;
}

export const TopHeaderCell = ({
  item,
  style,
  getCellClickHandler,
  onResize,
}: TopHeaderCellProps) => {
  const { value, clicked, isGrandTotal, maxDepthBelow, span } = item;

  const tc = useTranslateContent();

  return (
    <Cell
      style={{
        ...style,
      }}
      value={tc(value)}
      isEmphasized
      isGrandTotal={isGrandTotal}
      isBorderedHeader={maxDepthBelow === 0}
      isBold
      onClick={getCellClickHandler(clicked)}
      onResize={span < 2 ? onResize : undefined}
    />
  );
};

type LeftHeaderCellProps = TopHeaderCellProps & {
  rowIndex: RowValue[][];
  settings: VisualizationSettings;
  onUpdateVisualizationSettings: (settings: VisualizationSettings) => void;
};

export const LeftHeaderCell = ({
  item,
  style,
  getCellClickHandler,
  rowIndex,
  settings,
  onUpdateVisualizationSettings,
  onResize,
}: LeftHeaderCellProps) => {
  const { value, isSubtotal, isGrandTotal, hasSubtotal, depth, path, clicked } =
    item;

  return (
    <Cell
      style={{
        ...style,
        ...(depth === 0 ? { paddingLeft: LEFT_HEADER_LEFT_SPACING } : {}),
      }}
      value={value}
      isEmphasized={isSubtotal}
      isGrandTotal={isGrandTotal}
      isBold
      onClick={getCellClickHandler(clicked)}
      onResize={onResize}
      icon={
        (isSubtotal || hasSubtotal) && (
          <RowToggleIcon
            data-testid={`${item.rawValue}-toggle-button`}
            value={path}
            settings={settings}
            updateSettings={onUpdateVisualizationSettings}
            hideUnlessCollapsed={isSubtotal}
            rowIndex={rowIndex} // used to get a list of "other" paths when open one item in a collapsed column
          />
        )
      }
    />
  );
};

interface BodyCellProps {
  style: React.CSSProperties;
  rowSection: BodyItem[];
  getCellClickHandler: CellClickHandler;
  cellWidths: number[];
  showTooltip?: boolean;
}

export const BodyCell = ({
  style,
  rowSection,
  getCellClickHandler,
  cellWidths,
  showTooltip = true,
}: BodyCellProps) => {
  return (
    <div style={style} className={CS.flex}>
      {rowSection.map(
        (
          { value, isSubtotal, isGrandTotal, clicked, backgroundColor },
          index,
        ) => {
          return (
            <Cell
              key={index}
              style={{
                flexBasis: cellWidths[index],
              }}
              value={value}
              isEmphasized={isSubtotal}
              isGrandTotal={isGrandTotal}
              isBold={isSubtotal}
              showTooltip={showTooltip}
              isBody
              onClick={getCellClickHandler(clicked)}
              backgroundColor={backgroundColor}
            />
          );
        },
      )}
    </div>
  );
};
