import type { ButtonHTMLAttributes } from "react";
import { useState } from "react";
import { match } from "ts-pattern";
import { t } from "ttag";

import { ToolbarButton } from "metabase/common/components/ToolbarButton";
import { useHasTokenFeature } from "metabase/common/hooks";
import {
  type DashboardAccessedVia,
  trackExportDashboardToPDF,
} from "metabase/dashboard/analytics";
import { DASHBOARD_PDF_EXPORT_ROOT_ID } from "metabase/dashboard/constants";
import { useDashboardContext } from "metabase/dashboard/context/context";
import { isJWT } from "metabase/lib/utils";
import { isUuid } from "metabase/lib/uuid";
import type { ActionIconProps } from "metabase/ui";
import { saveCurrentTabAsPdf } from "metabase/visualizations/lib/save-current-tab-pdf";

export const ExportCurrentTabPdfButton = (
  props: ActionIconProps & ButtonHTMLAttributes<HTMLButtonElement>,
) => {
  const { dashboard } = useDashboardContext();
  const isWhitelabeled = useHasTokenFeature("whitelabel");
  const includeBranding = !isWhitelabeled;
  const [isExporting, setIsExporting] = useState(false);

  const saveAsPDF = async () => {
    if (isExporting) {
      return;
    }

    setIsExporting(true);

    try {
      const dashboardAccessedVia = match(dashboard?.id)
        .returnType<DashboardAccessedVia>()
        .when(isJWT, () => "static-embed")
        .when(isUuid, () => "public-link")
        .otherwise(() => "sdk-embed");

      trackExportDashboardToPDF({
        dashboardAccessedVia,
      });

      const cardNodeSelector = `#${DASHBOARD_PDF_EXPORT_ROOT_ID}`;
      await saveCurrentTabAsPdf({
        selector: cardNodeSelector,
        dashboardName: dashboard?.name ?? t`Exported dashboard`,
        includeBranding,
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <ToolbarButton
      icon="download"
      onClick={saveAsPDF}
      disabled={isExporting}
      tooltipLabel={isExporting ? t`Preparing PDF…` : t`Download as PDF`}
      tooltipPosition="bottom"
      data-testid="export-as-pdf-button"
      {...props}
    />
  );
};
