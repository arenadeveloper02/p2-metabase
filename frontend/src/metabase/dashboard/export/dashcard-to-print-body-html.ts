import {
  getVirtualCardType,
  isActionDashCard,
  isQuestionDashCard,
  isVirtualDashCard,
} from "metabase/dashboard/utils";
import { createRawSeries } from "metabase/query_builder/utils";
import type { DashboardCard, Dataset } from "metabase-types/api";
import type { State } from "metabase-types/store";

import { datasetToHtmlTable } from "./dataset-to-html-table";

type RenderChartFn = (
  rawSeries: unknown,
  dashcardSettings: Record<string, unknown>,
  options: Record<string, unknown>,
) => string;

const tableLikeDisplays = new Set([
  "table",
  "pivot",
  "object",
  "list",
]);

const escapeHtml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const virtualTextHtml = (dashcard: DashboardCard): string => {
  const text =
    (dashcard.visualization_settings as { text?: string } | undefined)?.text ??
    "";
  return `<div class="mb-export-text">${escapeHtml(String(text))}</div>`;
};

const virtualHeadingHtml = (dashcard: DashboardCard): string => {
  const text =
    (dashcard.visualization_settings as { text?: string } | undefined)?.text ??
    "";
  return `<h2 class="mb-export-heading">${escapeHtml(String(text))}</h2>`;
};

const virtualLinkHtml = (dashcard: DashboardCard): string => {
  const vs = dashcard.visualization_settings as
    | { link?: { url?: string; label?: string } }
    | undefined;
  const link = vs?.link;
  const url = escapeHtml(String(link?.url ?? ""));
  const label = escapeHtml(String(link?.label ?? link?.url ?? "Link"));
  if (!url) {
    return `<div class="mb-export-placeholder">${escapeHtml("Link")}</div>`;
  }
  return `<div class="mb-export-link"><a href="${url}">${label}</a></div>`;
};

const virtualIframeHtml = (): string =>
  `<div class="mb-export-placeholder">${escapeHtml("Embedded content omitted in PDF export")}</div>`;

export const dashcardToPrintBodyHtml = async (
  dashcard: DashboardCard,
  dataset: Dataset | null | undefined,
  state: State,
  renderChart: RenderChartFn,
): Promise<string> => {
  if (isActionDashCard(dashcard)) {
    return `<div class="mb-export-placeholder">${escapeHtml("Actions are not included in PDF export")}</div>`;
  }

  if (isVirtualDashCard(dashcard)) {
    const t = getVirtualCardType(dashcard);
    switch (t) {
      case "text":
        return virtualTextHtml(dashcard);
      case "heading":
        return virtualHeadingHtml(dashcard);
      case "link":
        return virtualLinkHtml(dashcard);
      case "iframe":
        return virtualIframeHtml();
      default:
        return `<div class="mb-export-placeholder">${escapeHtml(String(t ?? "card"))}</div>`;
    }
  }

  if (!isQuestionDashCard(dashcard) || !dashcard.card) {
    return `<div class="mb-export-placeholder">${escapeHtml("Unsupported card")}</div>`;
  }

  if (!dataset || dataset.error) {
    return `<div class="mb-export-error">${escapeHtml(
      typeof dataset?.error === "string"
        ? dataset.error
        : dataset?.error != null
          ? "Query failed"
          : "No data",
    )}</div>`;
  }

  const display = dashcard.card.display;

  if (tableLikeDisplays.has(display)) {
    return datasetToHtmlTable(dataset);
  }

  const rawSeries = createRawSeries({
    card: dashcard.card,
    queryResult: dataset,
    datasetQuery: dashcard.card.dataset_query,
  });

  if (!rawSeries) {
    return `<div class="mb-export-placeholder">${escapeHtml("No series")}</div>`;
  }

  const dashcardSettings = dashcard.visualization_settings ?? {};
  const tokenFeatures = state.settings.values["token-features"];
  const applicationColors = state.settings.values["application-colors"];
  const customFormatting = state.settings.values["custom-formatting"];
  const startOfWeek = state.settings.values["start-of-week"] ?? "sunday";

  try {
    return renderChart(rawSeries, dashcardSettings, {
      tokenFeatures,
      applicationColors,
      customFormatting,
      startOfWeek,
    });
  } catch {
    return datasetToHtmlTable(dataset);
  }
};
