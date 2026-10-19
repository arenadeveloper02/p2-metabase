import { getDarkTheme } from "./dark";
import { getLightTheme } from "./light";

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
  ["light", getLightTheme()],
  ["dark", getDarkTheme()],
])("%s theme", (_name, theme) => {
  it("should define every non-whitelabel color as a literal value", () => {
    const offenders = Object.entries(theme.colors)
      .filter(([, value]) => !isWhitelabelDerived(value))
      .filter(([, value]) => !LITERAL_COLOR.test(value))
      .map(([key, value]) => `${key}: ${value}`);

    expect(offenders).toEqual([]);
  });
});

describe("Sim DS semantic mapping", () => {
  it("uses Sim neutrals and Metabase default brand in light", () => {
    const colors = getLightTheme().colors;
    expect(colors["text-primary"]).toBe("#1A1A1A");
    expect(colors["background_page-primary"]).toBe("#FEFEFE");
    expect(colors["border-neutral"]).toBe("#DEDEDE");
    expect(colors["core-brand"]).toBe("hsla(208, 72%, 60%, 1.00)");
    expect(colors["button-filled-brand-default"]).toBe(
      "color-mix(in srgb, var(--mb-color-core-brand), black 28%)",
    );
  });

  it("uses Sim neutrals and Metabase default brand in dark", () => {
    const colors = getDarkTheme().colors;
    expect(colors["text-primary"]).toBe("#E6E6E6");
    expect(colors["background_page-primary"]).toBe("#1B1B1B");
    expect(colors["border-neutral"]).toBe("#444444");
    expect(colors["core-brand"]).toBe("hsla(208, 72%, 60%, 1.00)");
    expect(colors["button-filled-brand-default"]).toBe(
      "color-mix(in srgb, var(--mb-color-core-brand), white 70%)",
    );
  });
});
