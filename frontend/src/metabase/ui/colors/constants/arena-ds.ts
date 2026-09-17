/* eslint-disable metabase/no-color-literals -- Sim DS primitives */

/**
 * Sim (p2-sim) neutrals for Metabase light/dark themes.
 * Hex source: arena-v3 `src/components/sim/tokens.css`.
 * Opaque colors are hex; alpha tokens are hsla so static viz / PDF can parse them.
 *
 * Surfaces, borders, and body text map to these tokens. Brand, focus, and
 * status colors stay on Metabase defaults (`base-colors.ts`).
 */
export const ds = {
  white: "#FFFFFF",
  black: "#000000",

  light: {
    bg: "#FEFEFE",
    surface1: "#FBFBFB",
    surface2: "#FFFFFF",
    surface3: "#F7F7F7",
    surface4: "#F5F5F5",
    surface5: "#F3F3F3",
    surface6: "#E5E5E5",
    surfaceHover: "#F2F2F2",
    surfaceActive: "#ECECEC",
    surfaceInverted: "#1B1B1B",
    surfaceInvertedHover: "#363636",

    textPrimary: "#1A1A1A",
    textSecondary: "#525252",
    textMuted: "#707070",
    textBody: "#3B3B3B",
    textIcon: "#525252",
    textInverse: "#FFFFFF",
    textTertiary: "#5C5C5C",
    textIconMuted: "#5C5C5C",
    textMutedInverse: "#A0A0A0",

    border: "#DEDEDE",
    border1: "#E0E0E0",
    borderInverted: "#363636",

    overlay: "hsla(0, 0%, 11%, 0.72)",
    shadow: "hsla(220, 39%, 18%, 0.1)",
  },

  dark: {
    bg: "#1B1B1B",
    surface1: "#1E1E1E",
    surface2: "#181818",
    surface3: "#1A1A1A",
    surface4: "#1C1C1C",
    surface5: "#222222",
    surface6: "#2A2A2A",
    surfaceHover: "#202020",
    surfaceActive: "#242424",
    surfaceInverted: "#242424",
    surfaceInvertedHover: "#363636",

    textPrimary: "#E6E6E6",
    textSecondary: "#CCCCCC",
    textMuted: "#A3A3A3",
    textBody: "#C1C1C1",
    textIcon: "#B3B3B3",
    textInverse: "#1B1B1B",
    textTertiary: "#B3B3B3",
    textIconMuted: "#949494",
    textMutedInverse: "#B3B3B3",

    border: "#444444",
    border1: "#444444",
    borderInverted: "#3D3D3D",

    overlay: "hsla(0, 0%, 0%, 0.72)",
    shadow: "hsla(0, 0%, 0%, 0.3)",
  },
} as const;

/** Chart series kept as a distinct palette; Sim tokens do not define series colors. */
export const DS_CHART_SERIES_LIGHT = [
  "#1A73E8",
  "#FB8145",
  "#B364D7",
  "#00A7D6",
  "#DFC612",
  "#F8528F",
  "#3BC884",
  "#6D717F",
] as const;

export const DS_CHART_SERIES_DARK = [
  "#76ABF1",
  "#FDB38F",
  "#D1A2E7",
  "#66CAE6",
  "#ECDD71",
  "#FB97BC",
  "#89DEB5",
  "#A7AAB2",
] as const;
