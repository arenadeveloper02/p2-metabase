import Color from "color";

import { color as paletteColor } from "metabase/ui/colors";

export function getHexColor(color: string) {
  // Convert color values to hex format since Apache Batik (SVG renderer used in static visualizations)
  // doesn't support functional color notations like hsla(), rgba(), etc.
  const candidates = [color, paletteColor(color)];
  for (const candidate of candidates) {
    try {
      return Color(candidate).hex();
    } catch {
      // Named tokens like leftover "accent8" are not CSS colors.
    }
  }
  return Color(paletteColor("accent0")).hex();
}
