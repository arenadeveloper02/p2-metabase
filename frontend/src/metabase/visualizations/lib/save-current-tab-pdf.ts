import Color from "color";
import { t } from "ttag";

import { DASHBOARD_HEADER_PARAMETERS_PDF_EXPORT_NODE_ID } from "metabase/dashboard/constants";

import {
  createBrandingElement,
  getBrandingConfig,
  getBrandingSize,
} from "./exports-branding-utils";
import { SAVING_DOM_IMAGE_CLASS } from "./save-chart-image";

const PAGE_PADDING = 16;
const LANDSCAPE_ASPECT_RATIO = 0.72;
const PORTRAIT_ASPECT_RATIO = 1.24;
const MAX_SCALE = 1.5;
// Approximate budget for the rendered canvas. html2canvas allocates a buffer of
// (width * scale) * (height * scale) * 4 bytes; many browsers cap canvases at
// ~16k px per side or ~256MP. We aim well below that so very tall dashboards
// stay responsive on lower-end machines (especially Windows).
const MAX_CANVAS_PIXELS = 32_000_000;
const MIN_SCALE = 0.5;

const EXPORTING_CLASSNAME = "dashboard-pdf-exporting";

const OVERLAY_SELECTORS = [
  '[role="tooltip"]',
  "[data-floating-ui-portal]",
  ".mantine-Portal",
  ".mantine-Tooltip-tooltip",
  ".mantine-Popover-dropdown",
  ".mantine-HoverCard-dropdown",
  ".mantine-Menu-dropdown",
];

export type PdfExportPhase =
  | { kind: "preparing" }
  | { kind: "capturing" }
  | { kind: "building" }
  | { kind: "page"; current: number; total: number }
  | { kind: "saving" };

interface SaveCurrentTabPdfProps {
  selector: string;
  dashboardName: string;
  includeBranding: boolean;
  onPhase?: (phase: PdfExportPhase) => void;
}

function createHeaderElement(dashboardName: string, marginBottom: number) {
  const header = document.createElement("div");
  header.style.cssText = `
    font-family: "Lato", sans-serif;
    font-size: 24px;
    font-weight: 700;
    color: var(--mb-color-text-primary);
    border-bottom: 1px solid var(--mb-color-border);
    padding: 24px 16px 16px 16px;
    margin-bottom: ${marginBottom}px;
  `;
  header.textContent = dashboardName;
  return header;
}

function getValidBackgroundColor(rawColor: string) {
  try {
    return Color(rawColor).hex();
  } catch {
    return "white";
  }
}

function removeOverlayNodes(node: HTMLElement) {
  node.querySelectorAll(OVERLAY_SELECTORS.join(",")).forEach((el) => el.remove());
}

/**
 * Yields to the browser so it can paint pending UI updates (e.g. the export
 * progress modal) and run any queued tasks before the next blocking step.
 */
function yieldToBrowser(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window.requestAnimationFrame === "function") {
      window.requestAnimationFrame(() => setTimeout(resolve, 0));
    } else {
      setTimeout(resolve, 0);
    }
  });
}

/**
 * Computes a scale that keeps the canvas allocation under MAX_CANVAS_PIXELS so
 * the export stays responsive on memory-constrained machines.
 */
function getAdaptiveScale(width: number, height: number) {
  const requestedScale = Math.min(window.devicePixelRatio || 1, MAX_SCALE);
  if (width <= 0 || height <= 0) {
    return requestedScale;
  }
  const cap = Math.sqrt(MAX_CANVAS_PIXELS / (width * height));
  return Math.max(MIN_SCALE, Math.min(requestedScale, cap));
}

export async function saveCurrentTabAsPdf({
  selector,
  dashboardName,
  includeBranding,
  onPhase,
}: SaveCurrentTabPdfProps) {
  onPhase?.({ kind: "preparing" });
  await yieldToBrowser();

  const dashboardRoot = document.querySelector(selector);
  const gridNode = dashboardRoot?.querySelector(".react-grid-layout");

  if (!gridNode || !(gridNode instanceof HTMLElement)) {
    console.warn(t`No dashboard content found`, selector);
    return;
  }

  const fileName = `${dashboardName}.pdf`;
  const header = createHeaderElement(dashboardName, 12);
  const parametersNode = dashboardRoot
    ?.querySelector(`#${DASHBOARD_HEADER_PARAMETERS_PDF_EXPORT_NODE_ID}`)
    ?.cloneNode(true);

  let parametersHeight = 0;
  if (parametersNode instanceof HTMLElement) {
    gridNode.append(parametersNode);
    parametersNode.style.cssText = "margin-bottom: 12px";
    parametersHeight = parametersNode.getBoundingClientRect().height + 12;
    gridNode.removeChild(parametersNode);
  }

  gridNode.appendChild(header);
  const headerHeight = header.getBoundingClientRect().height + 12;
  gridNode.removeChild(header);

  const contentWidth = Math.max(gridNode.offsetWidth, gridNode.scrollWidth);
  const verticalOffset = headerHeight + parametersHeight;
  const contentHeight = Math.max(gridNode.offsetHeight, gridNode.scrollHeight);
  const totalHeight = contentHeight + verticalOffset;

  const orientation = contentWidth > totalHeight ? "landscape" : "portrait";
  const pageWidth = contentWidth + PAGE_PADDING * 2;
  const pageHeightTarget = Math.round(
    pageWidth *
      (orientation === "landscape"
        ? LANDSCAPE_ASPECT_RATIO
        : PORTRAIT_ASPECT_RATIO),
  );

  const rawBackgroundColor = getComputedStyle(document.documentElement)
    .getPropertyValue("--mb-color-bg-dashboard")
    .trim();
  const backgroundColor =
    rawBackgroundColor === "transparent"
      ? "white"
      : getValidBackgroundColor(rawBackgroundColor);

  const [{ default: html2canvas }, { default: jspdf }] = await Promise.all([
    import("html2canvas-pro"),
    import("jspdf"),
  ]);

  const scale = getAdaptiveScale(contentWidth, totalHeight);

  const size = getBrandingSize(pageWidth);
  const brandingHeight = includeBranding ? getBrandingConfig(size).h : 0;
  const yStartOffset = includeBranding ? brandingHeight : 0;

  document.body.classList.add(EXPORTING_CLASSNAME);

  try {
    onPhase?.({ kind: "capturing" });
    await yieldToBrowser();

    const image = await html2canvas(gridNode, {
      width: contentWidth,
      height: totalHeight,
      backgroundColor,
      useCORS: true,
      scale,
      nonce: window.MetabaseNonce,
      onclone: (_doc: Document, node: HTMLElement) => {
        node.classList.add(SAVING_DOM_IMAGE_CLASS);
        node.style.width = `${contentWidth}px`;
        node.style.height = `${totalHeight}px`;
        node.style.backgroundColor = backgroundColor;

        removeOverlayNodes(node);

        if (parametersNode instanceof HTMLElement) {
          node.insertBefore(parametersNode, node.firstChild);
        }
        node.insertBefore(header, node.firstChild);

        if (includeBranding) {
          const branding = createBrandingElement(size);
          node.insertBefore(branding, node.firstChild);
        }
      },
    });

    onPhase?.({ kind: "building" });
    await yieldToBrowser();

    const pdf = new jspdf({
      orientation,
      unit: "px",
      format: [pageWidth, pageHeightTarget],
      hotfixes: ["px_scaling"],
    });

    const maxSliceHeight = Math.max(pageHeightTarget - PAGE_PADDING * 2, 1);
    const pageRanges: Array<{ startY: number; endY: number }> = [];
    for (let startY = 0; startY < totalHeight; startY += maxSliceHeight) {
      pageRanges.push({
        startY,
        endY: Math.min(startY + maxSliceHeight, totalHeight),
      });
    }

    for (let index = 0; index < pageRanges.length; index += 1) {
      const { startY, endY } = pageRanges[index];

      onPhase?.({
        kind: "page",
        current: index + 1,
        total: pageRanges.length,
      });
      // Yield each iteration so the spinner/text can update without blocking.
      await yieldToBrowser();

      const sliceHeight = endY - startY;
      const pageHeight =
        index === pageRanges.length - 1
          ? Math.max(
              sliceHeight + PAGE_PADDING * 2 + yStartOffset,
              pageHeightTarget,
            )
          : pageHeightTarget;

      if (index > 0) {
        pdf.addPage([pageWidth, pageHeight], orientation);
      }

      pdf.setFillColor(backgroundColor);
      pdf.rect(0, 0, pageWidth, pageHeight, "F");

      const pageCanvas = document.createElement("canvas");
      pageCanvas.width = Math.round(contentWidth * scale);
      pageCanvas.height = Math.round(sliceHeight * scale);

      const ctx = pageCanvas.getContext("2d");
      if (!ctx) {
        continue;
      }

      ctx.drawImage(
        image,
        0,
        Math.round(startY * scale),
        Math.round(contentWidth * scale),
        Math.round(sliceHeight * scale),
        0,
        0,
        Math.round(contentWidth * scale),
        Math.round(sliceHeight * scale),
      );

      pdf.addImage(
        pageCanvas,
        "JPEG",
        PAGE_PADDING,
        PAGE_PADDING + (index === 0 ? yStartOffset : 0),
        contentWidth,
        sliceHeight,
      );
    }

    onPhase?.({ kind: "saving" });
    await yieldToBrowser();

    pdf.save(fileName);
  } finally {
    document.body.classList.remove(EXPORTING_CLASSNAME);
  }
}
