/* eslint-disable metabase/no-color-literals -- Arena DS primitives */

/**
 * Arena design-system color primitives.
 * Hex source: arena-v3 `src/components/ds/tokens.css`.
 * Opaque colors are hex; alpha tokens are hsla so static viz / PDF can parse them.
 */
export const ds = {
  white: "#FFFFFF",
  black: "#000000",

  grey: {
    50: "#F7F8F9",
    200: "#E2E3E5",
    300: "#C5C6CC",
    400: "#A7AAB2",
    500: "#8A8D99",
    600: "#6D717F",
    700: "#575A66",
    800: "#41444C",
    900: "#2C2D33",
    950: "#16171A",
  },

  blue: {
    50: "#F3F8FE",
    200: "#D1E3FA",
    300: "#A3C7F6",
    400: "#76ABF1",
    500: "#488FED",
    600: "#1A73E8",
    700: "#155CBA",
    800: "#10458B",
    900: "#0A2E5D",
  },

  pink: {
    400: "#FB97BC",
    600: "#F8528F",
  },

  purple: {
    400: "#D1A2E7",
    600: "#B364D7",
  },

  seaBlue: {
    400: "#66CAE6",
    600: "#00A7D6",
  },

  yellow: {
    400: "#ECDD71",
    600: "#DFC612",
  },

  green: {
    400: "#89DEB5",
    600: "#3BC884",
  },

  success: {
    50: "#F5FCF9",
    300: "#B1E9CE",
    400: "#89DEB5",
    600: "#3BC884",
    700: "#2FA06A",
    800: "#23784F",
  },

  warning: {
    50: "#FFF9F5",
    300: "#FDCDB5",
    400: "#FDB38F",
    600: "#FB8145",
    700: "#C96737",
    800: "#974D29",
  },

  error: {
    50: "#FFF3F3",
    300: "#FAA3A3",
    400: "#F87676",
    600: "#F31A1A",
    700: "#C21515",
    800: "#921010",
  },

  overlay: {
    light: "hsla(231, 7%, 19%, 0.72)",
    dark: "hsla(0, 0%, 0%, 0.72)",
  },

  focusRing: {
    light: "hsla(214, 82%, 51%, 0.3)",
    dark: "hsla(214, 82%, 61%, 0.4)",
  },

  brandSurface: {
    dark: "hsla(214, 82%, 51%, 0.16)",
  },

  interactiveSelected: {
    dark: "hsla(214, 82%, 51%, 0.2)",
  },

  statusSurface: {
    successDark: "hsla(151, 56%, 51%, 0.16)",
    warningDark: "hsla(20, 96%, 63%, 0.16)",
    errorDark: "hsla(0, 90%, 53%, 0.16)",
    infoDark: "hsla(214, 82%, 51%, 0.16)",
  },

  shadow: {
    light: "hsla(231, 7%, 19%, 0.1)",
    dark: "hsla(0, 0%, 0%, 0.45)",
  },
} as const;

/** Arena chart series at 600 (light) / 400 (dark). Uppercase hex matches Color().hex(). */
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
