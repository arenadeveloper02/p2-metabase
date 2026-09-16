import type { ChartColorV2 } from "../types";

import { DS_CHART_SERIES_DARK, DS_CHART_SERIES_LIGHT, ds } from "./arena-ds";

export const DEFAULT_ACCENT_COLORS: ChartColorV2[] = [...DS_CHART_SERIES_LIGHT];

export const LIGHT_THEME_ACCENT_COLORS: ChartColorV2[] = [
  ...DS_CHART_SERIES_LIGHT,
  {
    base: ds.light.surface6,
    tint: ds.light.surface3,
    shade: ds.light.textMutedInverse,
  },
];

export const DARK_THEME_ACCENT_COLORS: ChartColorV2[] = [
  ...DS_CHART_SERIES_DARK,
  {
    base: ds.dark.surface6,
    tint: ds.dark.surface5,
    shade: ds.dark.bg,
  },
];
