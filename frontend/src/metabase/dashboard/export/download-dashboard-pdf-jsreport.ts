import _ from "underscore";

import { buildDashboardPrintHtmlDocument } from "metabase/dashboard/export/build-dashboard-print-html-document";
import { dashcardToPrintBodyHtml } from "metabase/dashboard/export/dashcard-to-print-body-html";
import { yieldToMain } from "metabase/dashboard/export/yield-to-main";
import api from "metabase/lib/api";
import type { Dashboard, DashboardCard, Dataset } from "metabase-types/api";
import type { State } from "metabase-types/store";

const sortDashcards = (dashcards: DashboardCard[]) =>
  _.sortBy(dashcards, (dc) => [(dc.row ?? 0), (dc.col ?? 0)]);

const escapeAttr = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

const triggerBrowserDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
};

export const downloadDashboardPdfViaJsreport = async ({
  dashboard,
  getState,
}: {
  dashboard: Dashboard;
  getState: () => State;
}): Promise<void> => {
  const state = getState();
  const dashcardData = state.dashboard.dashcardData;

  const { RenderChart } = await import("metabase/static-viz/index.js");

  const sections: string[] = [];

  for (const dashcard of sortDashcards(dashboard.dashcards ?? [])) {
    await yieldToMain();
    const cardId = dashcard.card_id;
    const dataset =
      cardId != null
        ? (dashcardData[dashcard.id]?.[cardId] as Dataset | undefined)
        : undefined;

    const title =
      dashcard.card?.name ??
      (dashcard.visualization_settings?.virtual_card as { text?: string } | undefined)
        ?.text ??
      "";

    const body = await dashcardToPrintBodyHtml(
      dashcard,
      dataset,
      state,
      RenderChart,
    );

    const wrapped = `<section class="mb-export-section mb-export-chart">
  <div class="mb-export-title">${escapeAttr(String(title))}</div>
  ${body}
</section>`;
    sections.push(wrapped);
  }

  const html = buildDashboardPrintHtmlDocument(
    dashboard.name ?? "Dashboard",
    sections,
  );

  const filename = `${(dashboard.name ?? "dashboard").replace(/[^\w.\-]+/g, "_")}.pdf`;

  const response = await fetch(
    `${api.basename}/api/dashboard/${dashboard.id}/export/pdf-jsreport`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...api.getClientHeaders(),
      },
      body: JSON.stringify({ html, filename }),
    },
  );

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      text || `PDF export failed with status ${String(response.status)}`,
    );
  }

  const blob = await response.blob();
  triggerBrowserDownload(blob, filename);
};
