import type { ComputedVisualizationSettings } from "metabase/viz-core";
import type { ColumnSettings } from "metabase-types/api";

/**
 * VisualizationSettings indexes keys that are not in its map as `any`.
 * Read them as `unknown` so callers narrow before use.
 */
export function readSetting(
  settings: ComputedVisualizationSettings,
  key: string,
): unknown {
  // The index signature is `any`; this cast only drops that.
  return settings[key] as unknown;
}

/** ColumnSettings has the same open `any` index. */
export function readColumnSetting(
  settings: ColumnSettings,
  key: string,
): unknown {
  // The index signature is `any`; this cast only drops that.
  return settings[key] as unknown;
}

export function settingString(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value)) {
    const first: unknown = value[0];
    return typeof first === "string" ? first : undefined;
  }
  return undefined;
}

export function settingBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

export function settingNumber(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
