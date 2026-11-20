import type { SeriesOrderSetting } from "metabase-types/api";

export function funnelStepDisplayName(
  rows: SeriesOrderSetting[] | null | undefined,
  stepKey: string,
  fallback: string,
): string {
  const step = rows?.find((row) => row.key === stepKey);
  if (step != null && step.name !== "" && step.name !== step.key) {
    return step.name;
  }
  return fallback;
}
