import type { ButtonHTMLAttributes } from "react";
import { match } from "ts-pattern";
import { t } from "ttag";

import { ToolbarButton } from "metabase/common/components/ToolbarButton";
import {
  type DashboardAccessedVia,
  trackExportDashboardToPDF,
} from "metabase/dashboard/analytics";
import { useDashboardContext } from "metabase/dashboard/context/context";
import { downloadDashboardPdfViaJsreport } from "metabase/dashboard/export/download-dashboard-pdf-jsreport";
import { useStore } from "metabase/lib/redux";
import { isJWT } from "metabase/lib/utils";
import { isUuid } from "metabase/lib/uuid";
import type { ActionIconProps } from "metabase/ui";

export const ExportAsPdfButton = (
  props: ActionIconProps & ButtonHTMLAttributes<HTMLButtonElement>,
) => {
  const { dashboard } = useDashboardContext();
  const store = useStore();

  const saveAsPDF = async () => {
    if (!dashboard) {
      return;
    }

    const dashboardAccessedVia = match(dashboard.id)
      .returnType<DashboardAccessedVia>()
      .when(isJWT, () => "static-embed")
      .when(isUuid, () => "public-link")
      .otherwise(() => "sdk-embed");

    trackExportDashboardToPDF({
      dashboardAccessedVia,
    });

    try {
      await downloadDashboardPdfViaJsreport({
        dashboard,
        getState: store.getState,
      });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <ToolbarButton
      icon="download"
      onClick={() => void saveAsPDF()}
      tooltipLabel={t`Download as PDF`}
      tooltipPosition="bottom"
      data-testid="export-as-pdf-button"
      {...props}
    />
  );
};
