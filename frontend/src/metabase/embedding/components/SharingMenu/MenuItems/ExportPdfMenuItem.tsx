import { trackExportDashboardToPDF } from "metabase/dashboard/analytics";
import { downloadDashboardPdfViaJsreport } from "metabase/dashboard/export/download-dashboard-pdf-jsreport";
import { isWithinIframe } from "metabase/lib/dom";
import { useStore } from "metabase/lib/redux";
import { Icon, Menu } from "metabase/ui";
import { getExportTabAsPdfButtonText } from "metabase/visualizations/lib/save-dashboard-pdf";
import type { Dashboard } from "metabase-types/api";

const usePdfExportHandler = (dashboard: Dashboard) => {
  const store = useStore();
  return async () => {
    await downloadDashboardPdfViaJsreport({
      dashboard,
      getState: store.getState,
    }).then(() => {
      trackExportDashboardToPDF({
        dashboardId: dashboard.id,
        dashboardAccessedVia: isWithinIframe()
          ? "interactive-iframe-embed"
          : "internal",
      });
    });
  };
};

export const ExportPdfMenuItem = ({
  dashboard,
  loading,
}: {
  dashboard: Dashboard;
  loading?: boolean;
}) => {
  const onExportPdf = usePdfExportHandler(dashboard);

  return (
    <Menu.Item
      data-testid="dashboard-export-pdf-button"
      leftSection={<Icon name="document" />}
      onClick={() => void onExportPdf()}
      disabled={loading}
      style={loading ? { cursor: "wait" } : undefined}
    >
      {getExportTabAsPdfButtonText(dashboard.tabs)}
    </Menu.Item>
  );
};
