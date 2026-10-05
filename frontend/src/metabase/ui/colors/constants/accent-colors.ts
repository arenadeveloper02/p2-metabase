/* eslint-disable metabase/no-color-literals -- chart series accent8–13 */
import type { ChartColorV2 } from "../types";

import { DS_CHART_SERIES_DARK, DS_CHART_SERIES_LIGHT, ds } from "./arena-ds";

/**
 * Additional series hues (accent8–accent13) with explicit tint/shade.
 * Values match the legacy palette entries formerly commented in palette.ts.
 */
export const EXTRA_CHART_SERIES_LIGHT: ChartColorV2[] = [
  { base: "#F975A5", tint: "#FCBAD2", shade: "#C64272" },
  { base: "#C283DF", tint: "#E1C1EF", shade: "#6B3C81" },
  { base: "#33B9DE", tint: "#99DCEF", shade: "#0086AB" },
  { base: "#E5D141", tint: "#F2E8A0", shade: "#B29E0E" },
  { base: "#62D39D", tint: "#B9E1EC", shade: "#2FA06A" },
  { base: "#FC9A6A", tint: "#FEE6DA", shade: "#C96737" },
];

/** Brighter bases for dark UI; shade ≈ light-theme base hue. */
export const EXTRA_CHART_SERIES_DARK: ChartColorV2[] = [
  { base: "#FCBAD2", tint: "#FEE6F0", shade: "#F975A5" },
  { base: "#E1C1EF", tint: "#F0E0F7", shade: "#C283DF" },
  { base: "#99DCEF", tint: "#CCEEF7", shade: "#33B9DE" },
  { base: "#F2E8A0", tint: "#F9F4D0", shade: "#E5D141" },
  { base: "#B9E1EC", tint: "#DCF0F6", shade: "#62D39D" },
  { base: "#FEE6DA", tint: "#FFF3EC", shade: "#FC9A6A" },
];

export const DEFAULT_ACCENT_COLORS: ChartColorV2[] = [
  ...DS_CHART_SERIES_LIGHT,
  ...EXTRA_CHART_SERIES_LIGHT,
];

export const LIGHT_THEME_ACCENT_COLORS: ChartColorV2[] = [
  ...DS_CHART_SERIES_LIGHT,
  ...EXTRA_CHART_SERIES_LIGHT,
  {
    base: ds.light.surface6,
    tint: ds.light.surface3,
    shade: ds.light.textMutedInverse,
  },
];

export const DARK_THEME_ACCENT_COLORS: ChartColorV2[] = [
  ...DS_CHART_SERIES_DARK,
  ...EXTRA_CHART_SERIES_DARK,
  {
    base: ds.dark.surface6,
    tint: ds.dark.surface5,
    shade: ds.dark.bg,
  },
];
