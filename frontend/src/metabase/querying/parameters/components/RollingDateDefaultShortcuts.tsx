import { Box, Button, Flex } from "metabase/ui";
import type { ParameterValueOrArray } from "metabase-types/api";

import { getRollingDateDefaults } from "../utils/rolling-date-defaults";

type RollingDateDefaultShortcutsProps = {
  parameterType: "date/single" | "date/range";
  value: ParameterValueOrArray | null | undefined;
  onChange: (value: string) => void;
};

export function RollingDateDefaultShortcuts({
  parameterType,
  value,
  onChange,
}: RollingDateDefaultShortcutsProps) {
  const shortcuts = getRollingDateDefaults(parameterType);

  return (
    <Box p="md" pb={0}>
      <Flex gap="xs" wrap="wrap">
        {shortcuts.map((shortcut) => (
          <Button
            key={shortcut.value}
            type="button"
            size="xs"
            variant={value === shortcut.value ? "filled" : "default"}
            fw="normal"
            aria-selected={value === shortcut.value}
            onClick={() => onChange(shortcut.value)}
          >
            {shortcut.label}
          </Button>
        ))}
      </Flex>
    </Box>
  );
}
