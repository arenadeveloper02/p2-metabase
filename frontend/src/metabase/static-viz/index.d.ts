declare module "metabase/static-viz/index.js" {
  export function RenderChart(
    rawSeries: unknown,
    dashcardSettings: Record<string, unknown>,
    options: Record<string, unknown>,
  ): string;

  export function LegacyRenderChart(type: unknown, options: unknown): string;
}
