/* eslint-disable metabase/no-color-literals -- we define chart colors here to avoid duplication */

import type { ChartColorV2 } from "../types";

import { DS_CHART_SERIES_DARK, DS_CHART_SERIES_LIGHT, ds } from "./arena-ds";

export const DEFAULT_ACCENT_COLORS: ChartColorV2[] = [...DS_CHART_SERIES_LIGHT];

export const LIGHT_THEME_ACCENT_COLORS: ChartColorV2[] = [
  ...DS_CHART_SERIES_LIGHT,
  {
    base: ds.grey[200],
    tint: ds.grey[50],
    shade: ds.grey[300],
  },
];

export const DARK_THEME_ACCENT_COLORS: ChartColorV2[] = [
  ...DS_CHART_SERIES_DARK,
  {
    base: ds.grey[800],
    tint: ds.grey[800],
    shade: ds.grey[950],
  },
];
