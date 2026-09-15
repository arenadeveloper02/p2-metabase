import { METABASE_DARK_THEME } from "./dark";
import { METABASE_LIGHT_THEME } from "./light";

// Static viz renders on the server and feeds every theme color straight into
// the `color` library, which only parses literals. Anything the browser would
// have to resolve — `color-mix` or `var()` throws there, so theme definitions have to
// reference the underlying value directly.
//
// Whitelabel colors are the one exception: they aren't known until runtime, so
// colors deriving from them have to stay dynamic.
const WHITELABEL_COLOR_KEYS = ["core-brand", "core-filter", "core-summarize"];

const LITERAL_COLOR =
  /^(hsla?\([^()]*\)|rgba?\([^()]*\)|#(?:[0-9a-fA-F]{3,8}))$/;

const isWhitelabelDerived = (value: string) =>
  WHITELABEL_COLOR_KEYS.some((key) => value.includes(`var(--mb-color-${key})`));

describe.each([
  ["light", METABASE_LIGHT_THEME],
  ["dark", METABASE_DARK_THEME],
])("%s theme", (_name, theme) => {
  it("should define every non-whitelabel color as a literal value", () => {
    const offenders = Object.entries(theme.colors)
      .filter(([, value]) => !isWhitelabelDerived(value))
      .filter(([, value]) => !LITERAL_COLOR.test(value))
      .map(([key, value]) => `${key}: ${value}`);

    expect(offenders).toEqual([]);
  });
});

describe("Arena DS semantic mapping", () => {
  it("uses Arena grey-900 text and white page in light", () => {
    expect(METABASE_LIGHT_THEME.colors["text-primary"]).toBe("#2C2D33");
    expect(METABASE_LIGHT_THEME.colors["background_page-primary"]).toBe(
      "#FFFFFF",
    );
    expect(METABASE_LIGHT_THEME.colors.brand).toBe("#1A73E8");
  });

  it("uses Arena grey-50 text and grey-950 page in dark", () => {
    expect(METABASE_DARK_THEME.colors["text-primary"]).toBe("#F7F8F9");
    expect(METABASE_DARK_THEME.colors["background_page-primary"]).toBe(
      "#16171A",
    );
    expect(METABASE_DARK_THEME.colors.brand).toBe("#488FED");
  });
});
