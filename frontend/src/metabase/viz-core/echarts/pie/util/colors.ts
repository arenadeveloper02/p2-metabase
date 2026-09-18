import { match } from "ts-pattern";

import { ACCENT_COUNT, aliases, colors } from "metabase/ui/colors";
import { isEmpty } from "metabase/utils/validate";

const ACCENT_KEY_PREFIX = "accent";

type AccentKey = string;

const isAccentColorKey = (key: string) => key.startsWith(ACCENT_KEY_PREFIX);

const extractAccentKey = (input: string): AccentKey => {
  const withoutPrefix = input.slice(ACCENT_KEY_PREFIX.length);
  return (
    withoutPrefix.split("-").filter((segment) => !isEmpty(segment))[0] ?? null
  );
};

export function createHexToAccentNumberMap() {
  const hexToAccentNumber = new Map<string, AccentKey>();

  for (const [colorKey, hex] of Object.entries(colors)) {
    if (!isAccentColorKey(colorKey)) {
      continue;
    }
    const accentKey = extractAccentKey(colorKey);
    if (accentKey && isKnownAccentKey(accentKey) && typeof hex === "string") {
      hexToAccentNumber.set(hex.toUpperCase(), accentKey);
    }
  }

  for (const [colorKey, hexGetter] of Object.entries(aliases)) {
    if (!isAccentColorKey(colorKey)) {
      continue;
    }

    const accentKey = extractAccentKey(colorKey);
    if (!accentKey || !isKnownAccentKey(accentKey)) {
      continue;
    }

    try {
      hexToAccentNumber.set(hexGetter(colors).toUpperCase(), accentKey);
    } catch {
      // Skip aliases whose base color was removed (e.g. accent8-light).
    }
  }

  return hexToAccentNumber;
}

export function getRingColorAlias(
  accentKey: AccentKey,
  ring: "inner" | "middle" | "outer",
) {
  const variant = match(ring)
    .with("inner", () => "dark")
    .with("outer", () => "light")
    .otherwise(() => null);

  return getColorName(accentKey, variant);
}

export function getPickerColorAlias(accentKey: AccentKey) {
  return getColorName(accentKey, "dark");
}

export function isKnownAccentKey(accentKey: AccentKey) {
  if (accentKey === "gray") {
    return true;
  }
  const index = Number(accentKey);
  return Number.isInteger(index) && index >= 0 && index < ACCENT_COUNT;
}

function getColorName(accentKey: AccentKey, variant: string | null) {
  let colorName = ACCENT_KEY_PREFIX;

  const isNumericKey = Number.isFinite(parseInt(accentKey));
  if (isNumericKey) {
    colorName += accentKey;
  } else {
    colorName += `-${accentKey}`;
  }

  if (variant != null) {
    colorName += `-${variant}`;
  }

  return colorName;
}
