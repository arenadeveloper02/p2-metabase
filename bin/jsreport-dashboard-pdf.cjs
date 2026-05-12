#!/usr/bin/env node
/**
 * Renders a UTF-8 HTML file to PDF using jsreport (@jsreport/jsreport-core + chrome-pdf).
 * Invoked by the Metabase backend; expects Node dependencies at the repo root.
 *
 * Usage: node bin/jsreport-dashboard-pdf.cjs <absolute-path-to-input.html>
 * PDF bytes are written to stdout (binary).
 */

"use strict";

const fs = require("fs").promises;
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
process.chdir(repoRoot);

const htmlPath = process.argv[2];
if (!htmlPath) {
  console.error("Usage: node bin/jsreport-dashboard-pdf.cjs <input.html>");
  process.exit(2);
}

async function main() {
  const html = await fs.readFile(htmlPath, "utf8");

  const jsreport = require("@jsreport/jsreport-core")({
    logger: {
      console: { transport: "console", level: "error" },
    },
    store: { provider: "memory" },
    chrome: {
      launchOptions: {
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
        ],
      },
    },
  });

  jsreport.use(require("@jsreport/jsreport-chrome-pdf")());
  jsreport.use(require("@jsreport/jsreport-handlebars")());

  await jsreport.init();
  try {
    const result = await jsreport.render({
      template: {
        // Triple-stash inserts raw HTML; inner `{{` from chart data is not re-parsed.
        content: "{{{html}}}",
        engine: "handlebars",
        recipe: "chrome-pdf",
        chrome: {
          format: "A3",
          landscape: true,
          printBackground: true,
          marginTop: "0.5cm",
          marginBottom: "0.5cm",
          marginLeft: "0.5cm",
          marginRight: "0.5cm",
          waitForJS: true,
          waitForNetworkIdle: true,
        },
      },
      data: { html },
    });
    process.stdout.write(result.content);
  } finally {
    await jsreport.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
