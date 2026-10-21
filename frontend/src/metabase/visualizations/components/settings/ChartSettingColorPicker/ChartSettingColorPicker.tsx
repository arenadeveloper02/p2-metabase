import cx from "classnames";

import type { PillSize } from "metabase/common/components/ColorPill";
import { ColorSelector } from "metabase/common/components/ColorSelector";
import CS from "metabase/css/core/index.css";
import { isEmbeddingSdk } from "metabase/embedding-sdk/config";
import { Box, Title } from "metabase/ui";
import {
  getNamedAccentColors,
  getStatusColors,
} from "metabase/ui/colors/groups";
import type { AccentColorOptions } from "metabase/ui/colors/types";

import S from "./ChartSettingColorPicker.module.css";

interface ChartSettingColorPickerProps {
  className?: string;
  value: string;
  title?: string;
  pillSize?: PillSize;
  bordered?: boolean;
  /**
   * Reports the palette color name of the picked color to onChange. Off by
   * default because the settings widget framework treats the second onChange
   * argument as a Question override.
   */
  forwardColorName?: boolean;
  /**
   * Must be false when the picker is rendered inside a parent Mantine popover,
   * where a portaled color dropdown registers as an outside click and closes
   * the parent before the selection is applied.
   */
  withinPortal?: boolean;
  onChange?: (hexValue: string, colorName?: string) => void;
  accentColorOptions?: AccentColorOptions;
  additionalColors?: string[];
}

export const ChartSettingColorPicker = ({
  className,
  value,
  title,
  pillSize,
  bordered,
  forwardColorName,
  // the SDK renders chart settings inside a parent Mantine popover
  withinPortal = !isEmbeddingSdk(),
  onChange,
  accentColorOptions = {
    main: true,
    light: true,
    dark: true,
    harmony: false,
    gray: true,
  },
  additionalColors = [],
}: ChartSettingColorPickerProps) => {
  const namedAccents = getNamedAccentColors(accentColorOptions);
  const accentValues = new Set(
    namedAccents.map((option) => option.value.toUpperCase()),
  );
  const colors = [
    ...namedAccents,
    ...getStatusColors().filter((hex) => !accentValues.has(hex.toUpperCase())),
    ...additionalColors,
  ];

  return (
    <Box
      className={cx(
        CS.flex,
        CS.alignCenter,
        { [S.bordered]: bordered },
        className,
      )}
    >
      <ColorSelector
        value={value}
        colors={colors}
        withinPortal={withinPortal}
        onChange={(hexValue, colorName) =>
          onChange?.(hexValue, forwardColorName ? colorName : undefined)
        }
        pillSize={pillSize}
      />
      {title && (
        <Title order={4} fz="md" ml={bordered ? "lg" : "sm"}>
          {title}
        </Title>
      )}
    </Box>
  );
};
