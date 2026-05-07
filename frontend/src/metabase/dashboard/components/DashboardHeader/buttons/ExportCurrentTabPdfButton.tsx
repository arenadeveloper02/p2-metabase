import type { ButtonHTMLAttributes } from "react";
import { useCallback, useState } from "react";
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
import {
  type ActionIconProps,
  Loader,
  Modal,
  Stack,
  Text,
} from "metabase/ui";
import {
  type PdfExportPhase,
  saveCurrentTabAsPdf,
} from "metabase/visualizations/lib/save-current-tab-pdf";

function describePhase(phase: PdfExportPhase | null): string {
  if (!phase) {
    return t`Preparing PDF…`;
  }
  switch (phase.kind) {
    case "preparing":
      return t`Preparing PDF…`;
    case "capturing":
      return t`Capturing dashboard…`;
    case "building":
      return t`Building PDF…`;
    case "page":
      return t`Rendering page ${phase.current} of ${phase.total}…`;
    case "saving":
      return t`Saving PDF…`;
  }
}

export const ExportCurrentTabPdfButton = (
  props: ActionIconProps & ButtonHTMLAttributes<HTMLButtonElement>,
) => {
  const { dashboard } = useDashboardContext();
  const isWhitelabeled = useHasTokenFeature("whitelabel");
  const includeBranding = !isWhitelabeled;
  const [isExporting, setIsExporting] = useState(false);
  const [phase, setPhase] = useState<PdfExportPhase | null>(null);

  const onPhase = useCallback((next: PdfExportPhase) => {
    setPhase(next);
  }, []);

  const saveAsPDF = async () => {
    if (isExporting) {
      return;
    }

    setIsExporting(true);
    setPhase({ kind: "preparing" });

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
        onPhase,
      });
    } finally {
      setIsExporting(false);
      setPhase(null);
    }
  };

  return (
    <>
      <ToolbarButton
        icon="download"
        onClick={saveAsPDF}
        disabled={isExporting}
        tooltipLabel={isExporting ? t`Preparing PDF…` : t`Download as PDF`}
        tooltipPosition="bottom"
        data-testid="export-as-pdf-button"
        {...props}
      />
      <Modal
        opened={isExporting}
        onClose={() => undefined}
        withCloseButton={false}
        closeOnClickOutside={false}
        closeOnEscape={false}
        centered
        title={t`Exporting dashboard`}
        data-testid="export-as-pdf-progress-modal"
      >
        <Stack align="center" gap="md" py="md">
          <Loader size="lg" />
          <Text ta="center">{describePhase(phase)}</Text>
          <Text size="sm" c="text-secondary" ta="center">
            {t`Please keep this tab open. Large dashboards may take a moment.`}
          </Text>
        </Stack>
      </Modal>
    </>
  );
};
