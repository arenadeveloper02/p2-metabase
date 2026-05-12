import type { Dataset } from "metabase-types/api";

const escapeHtml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const formatCell = (v: unknown): string => {
  if (v == null) {
    return "";
  }
  if (typeof v === "string") {
    return escapeHtml(v);
  }
  if (typeof v === "number" || typeof v === "boolean") {
    return escapeHtml(String(v));
  }
  try {
    return escapeHtml(JSON.stringify(v));
  } catch {
    return "";
  }
};

/** Non-virtualized HTML table for print / PDF export. */
export const datasetToHtmlTable = (dataset: Dataset): string => {
  const cols = dataset.data?.cols ?? [];
  const rows = dataset.data?.rows ?? [];
  if (cols.length === 0) {
    return `<p class="mb-export-empty">${escapeHtml("No results")}</p>`;
  }

  const header = `<thead><tr>${cols
    .map((c) =>
      `<th>${escapeHtml(String(c.display_name ?? c.name ?? ""))}</th>`,
    )
    .join("")}</tr></thead>`;

  const bodyRows = rows
    .map(
      (row) =>
        `<tr>${(row as unknown[])
          .map((cell) => `<td>${formatCell(cell)}</td>`)
          .join("")}</tr>`,
    )
    .join("");

  return `<table class="mb-export-table">${header}<tbody>${bodyRows}</tbody></table>`;
};
