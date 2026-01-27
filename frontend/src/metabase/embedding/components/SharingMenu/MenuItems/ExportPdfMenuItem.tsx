import { useState } from "react";

import { useHasTokenFeature } from "metabase/common/hooks";
import { trackExportDashboardToPDF } from "metabase/dashboard/analytics";
import { DASHBOARD_PDF_EXPORT_ROOT_ID } from "metabase/dashboard/constants";
import { isWithinIframe } from "metabase/lib/dom";
import { Icon, Menu } from "metabase/ui";
import {
  getExportTabAsPdfButtonText,
  saveDashboardPdfAsSinglePage,
} from "metabase/visualizations/lib/save-dashboard-pdf";
import type { Dashboard } from "metabase-types/api";

const handleClick = async (
  dashboard: Dashboard,
  includeBranding: boolean,
  setIsExporting: (value: boolean) => void,
) => {
  const cardNodeSelector = `#${DASHBOARD_PDF_EXPORT_ROOT_ID}`;
  
  try {
    setIsExporting(true);
    
    await saveDashboardPdfAsSinglePage(cardNodeSelector, dashboard.name);
    
    trackExportDashboardToPDF({
      dashboardId: dashboard.id,
      dashboardAccessedVia: isWithinIframe()
        ? "interactive-iframe-embed"
        : "internal",
    });
  } catch (error) {
    console.error("Error exporting dashboard to PDF:", error);
    
    // Show user-friendly error message
    const errorMessage = error instanceof Error 
      ? error.message 
      : "An unexpected error occurred while exporting the dashboard.";
    
    alert(`Failed to export PDF: ${errorMessage}\n\nPlease try again or contact support if the issue persists.`);
  } finally {
    setIsExporting(false);
  }
};

export const ExportPdfMenuItem = ({
  dashboard,
  loading,
}: {
  dashboard: Dashboard;
  loading?: boolean;
}) => {
  const isWhitelabeled = useHasTokenFeature("whitelabel");
  const includeBranding = !isWhitelabeled;
  const [isExporting, setIsExporting] = useState(false);

  const isDisabled = loading || isExporting;

  return (
    <Menu.Item
      data-testid="dashboard-export-pdf-button"
      leftSection={<Icon name="document" />}
      onClick={() => handleClick(dashboard, includeBranding, setIsExporting)}
      disabled={isDisabled}
      style={isDisabled ? { cursor: "wait" } : undefined}
    >
      {getExportTabAsPdfButtonText(dashboard.tabs)}
    </Menu.Item>
  );
};
