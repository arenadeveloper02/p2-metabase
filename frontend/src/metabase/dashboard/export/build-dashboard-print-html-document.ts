const escapeHtml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const exportCss = `
@page {
  size: A3 landscape;
  margin: 0.5cm;
}
html, body {
  margin: 0;
  padding: 0;
  background: var(--mb-color-background, #fff);
  color: var(--mb-color-text-dark, #2e3538);
  font-family: Lato, "Helvetica Neue", Helvetica, Arial, sans-serif;
}
.mb-export-root {
  width: 100%;
  overflow: visible !important;
}
.mb-export-section {
  break-inside: avoid;
  page-break-inside: avoid;
  margin-bottom: 1rem;
  padding: 0.5rem;
  border: 1px solid var(--mb-color-border, #e0e0e0);
  border-radius: 4px;
  overflow: visible !important;
}
.mb-export-title {
  font-size: 0.85rem;
  font-weight: 700;
  margin: 0 0 0.35rem 0;
}
.mb-export-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.65rem;
  table-layout: auto;
  overflow: visible !important;
}
.mb-export-table th,
.mb-export-table td {
  border: 1px solid var(--mb-color-border, #d9d9d9);
  padding: 0.2rem 0.35rem;
  vertical-align: top;
  word-wrap: break-word;
  overflow-wrap: anywhere;
  white-space: normal;
  max-width: none;
}
.mb-export-table th {
  background: var(--mb-color-bg-light, #f5f5f5);
  font-weight: 600;
}
.mb-export-text {
  font-size: 0.75rem;
  white-space: pre-wrap;
}
.mb-export-heading {
  font-size: 1rem;
  margin: 0;
}
.mb-export-placeholder,
.mb-export-error,
.mb-export-empty {
  font-size: 0.75rem;
  color: var(--mb-color-text-secondary, #7172ad);
}
.mb-export-chart svg {
  max-width: 100%;
  height: auto;
}
`;

const readyScript = `
<script>
  window.JSREPORT_READY_TO_START = false;
  function markReady() {
    window.JSREPORT_READY_TO_START = true;
  }
  const fontWait = document.fonts && document.fonts.ready
    ? document.fonts.ready.catch(function () {})
    : Promise.resolve();
  const imageWait = Promise.all(
    Array.prototype.map.call(document.images || [], function (img) {
      if (img.complete) {
        return Promise.resolve();
      }
      return new Promise(function (resolve) {
        img.onload = img.onerror = resolve;
      });
    })
  );
  Promise.all([fontWait, imageWait]).then(function () {
    requestAnimationFrame(function () {
      requestAnimationFrame(markReady);
    });
  });
</script>
`;

export const buildDashboardPrintHtmlDocument = (
  dashboardTitle: string,
  sectionHtmlParts: string[],
): string => {
  const body = sectionHtmlParts.join("\n");
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>${escapeHtml(dashboardTitle)}</title>
  <style>${exportCss}</style>
</head>
<body>
  <div class="mb-export-root">
    <h1 class="mb-export-dashboard-title" style="font-size:1.1rem;margin:0 0 0.75rem 0;">${escapeHtml(dashboardTitle)}</h1>
    ${body}
  </div>
  ${readyScript}
</body>
</html>`;
};
