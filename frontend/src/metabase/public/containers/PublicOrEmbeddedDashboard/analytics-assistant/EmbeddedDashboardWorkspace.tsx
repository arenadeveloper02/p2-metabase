import { type ReactNode, useState } from "react";
import { t } from "ttag";

import { ActionIcon, Icon, Tooltip } from "metabase/ui";

import { AnalyticsAssistantPanel } from "./AnalyticsAssistantPanel";
import S from "./EmbeddedDashboardWorkspace.module.css";

export function EmbeddedDashboardWorkspace({
  endpoint,
  dashboardId,
  dashboardName,
  selectedTabId,
  children,
}: {
  endpoint: string;
  dashboardId: number | string;
  dashboardName: string;
  selectedTabId: number | null;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className={S.workspace}>
      <div className={S.dashboard}>
        {children}
        {open ? null : (
          <Tooltip label={t`Ask Arena AI`}>
            <ActionIcon
              type="button"
              variant="filled"
              size="xl"
              radius="xl"
              className={S.ask}
              aria-label={t`Open analytics assistant`}
              data-testid="analytics-assistant-open"
              onClick={() => setOpen(true)}
            >
              <Icon name="metabot" size={22} />
            </ActionIcon>
          </Tooltip>
        )}
      </div>
      <div className={open ? S.panelOpen : S.panel}>
        {open ? (
          <AnalyticsAssistantPanel
            endpoint={endpoint}
            dashboardId={dashboardId}
            dashboardName={dashboardName}
            selectedTabId={selectedTabId}
            onClose={() => setOpen(false)}
          />
        ) : null}
      </div>
    </div>
  );
}
