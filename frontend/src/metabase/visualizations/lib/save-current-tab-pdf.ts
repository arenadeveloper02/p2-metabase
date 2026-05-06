import Color from "color";

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
const EXPORTING_CLASSNAME = "dashboard-pdf-exporting";

const OVERLAY_SELECTORS = [
  '[role="tooltip"]',
  '[data-floating-ui-portal]',
  ".mantine-Portal",
  ".mantine-Tooltip-tooltip",
  ".mantine-Popover-dropdown",
  ".mantine-HoverCard-dropdown",
  ".mantine-Menu-dropdown",
];

interface SaveCurrentTabPdfProps {
  selector: string;
  dashboardName: string;
  includeBranding: boolean;
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

export async function saveCurrentTabAsPdf({
  selector,
  dashboardName,
  includeBranding,
}: SaveCurrentTabPdfProps) {
  const dashboardRoot = document.querySelector(selector);
  const gridNode = dashboardRoot?.querySelector(".react-grid-layout");

  if (!gridNode || !(gridNode instanceof HTMLElement)) {
    console.warn("No dashboard content found", selector);
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

  const { default: html2canvas } = await import("html2canvas-pro");
  const { default: jspdf } = await import("jspdf");

  const scale = Math.min(window.devicePixelRatio || 1, MAX_SCALE);

  const size = getBrandingSize(pageWidth);
  const brandingHeight = includeBranding ? getBrandingConfig(size).h : 0;
  const yStartOffset = includeBranding ? brandingHeight : 0;

  document.body.classList.add(EXPORTING_CLASSNAME);

  try {
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

    pageRanges.forEach(({ startY, endY }, index) => {
      const sliceHeight = endY - startY;
      const pageHeight =
        index === pageRanges.length - 1
          ? Math.max(sliceHeight + PAGE_PADDING * 2 + yStartOffset, pageHeightTarget)
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
        return;
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
    });

    pdf.save(fileName);
  } finally {
    document.body.classList.remove(EXPORTING_CLASSNAME);
  }
}
