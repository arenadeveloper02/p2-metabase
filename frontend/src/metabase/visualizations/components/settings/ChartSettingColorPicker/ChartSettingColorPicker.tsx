import cx from "classnames";

import type { PillSize } from "metabase/common/components/ColorPill";
import { ColorSelector } from "metabase/common/components/ColorSelector";
import CS from "metabase/css/core/index.css";
import { isEmbeddingSdk } from "metabase/embedding-sdk/config";
import { getAccentColors, getStatusColors } from "metabase/lib/colors/groups";
import type { AccentColorOptions } from "metabase/lib/colors/types";
import { Box, type BoxProps } from "metabase/ui";

interface ChartSettingColorPickerProps extends BoxProps {
  className?: string;
  value: string;
  title?: string;
  pillSize?: PillSize;
  onChange?: (newValue: string) => void;
  accentColorOptions?: AccentColorOptions;
  additionalColors?: string[];
}

export const ChartSettingColorPicker = ({
  className,
  value,
  title,
  pillSize,
  onChange,
  accentColorOptions = {
    main: true,
    light: true,
    dark: true,
    harmony: false,
    gray: true,
  },
  additionalColors = [],
  ...boxProps
}: ChartSettingColorPickerProps) => {
  // For the SDK the ColorSelector is rendered inside a parent Mantine popover,
  // so as a nested popover it should not be rendered within a portal
  const withinPortal = !isEmbeddingSdk();

  // Include status colors by default for all charts, but they won't be automatically applied
  // Users can manually select them from the color palette if needed
  const defaultAdditionalColors = getStatusColors();
  const accentColors = getAccentColors(accentColorOptions);
  
  // Normalize all colors to uppercase hex format and remove duplicates
  const normalizeColor = (color: string) => color.toUpperCase();
  const allColors = [
    ...accentColors.map(normalizeColor),
    ...defaultAdditionalColors.map(normalizeColor),
    ...additionalColors.map(normalizeColor),
  ];
  
  // Remove duplicates while preserving order
  const uniqueColors = Array.from(new Set(allColors));

  // Filter out invalid Box props
  const {
    onChangeSettings,
    onChangeSeriesColor,
    onUpdate,
    ...validBoxProps
  } = boxProps as any;

  return (
    <Box className={cx(CS.flex, CS.alignCenter, className)} {...validBoxProps}>
      <ColorSelector
        value={value}
        colors={uniqueColors}
        withinPortal={withinPortal}
        onChange={onChange}
        pillSize={pillSize}
      />
      {title && <h4 className={CS.ml1}>{title}</h4>}
    </Box>
  );
};
