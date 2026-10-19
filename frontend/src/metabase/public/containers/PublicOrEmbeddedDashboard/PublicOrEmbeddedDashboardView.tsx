import cx from "classnames";
import _ from "underscore";

import CS from "metabase/css/core/index.css";
import DashboardS from "metabase/css/dashboard.module.css";
import { Dashboard } from "metabase/dashboard/components/Dashboard";
import { DashboardHeaderButtonRow } from "metabase/dashboard/components/DashboardHeader/DashboardHeaderButtonRow/DashboardHeaderButtonRow";
import { useDashboardContext } from "metabase/dashboard/context";
import { getTabHiddenParameterSlugs } from "metabase/embedding/lib/tab-parameters";
import type { DisplayTheme } from "metabase/embedding/types";
import { usePageTitle } from "metabase/hooks/use-page-title";
import { FullWidthContainer } from "metabase/styled-components/layout/FullWidthContainer";
import { isWithinIframe } from "metabase/utils/iframe";

import { EmbedFrame } from "../../components/EmbedFrame";

import { EmbeddedDashboardWorkspace } from "./analytics-assistant/EmbeddedDashboardWorkspace";
import {
  analyticsAssistantEndpoint,
  embeddedDashboardToken,
  publicDashboardUuid,
} from "./analytics-assistant/constants";

export function PublicOrEmbeddedDashboardView() {
  const {
    setParameterValue,
    setParameterValueToDefault,
    dashboard,
    isFullscreen,
    selectedTabId,
    parameters,
    headerParameters,
    parameterValues,
    draftParameterValues,
    dashboardId,
    background,
    bordered,
    titled,
    theme,
    hideParameters,
    withFooter,
    downloadsEnabled,
  } = useDashboardContext();

  usePageTitle(dashboard?.name || "", { titleIndex: 1 });

  const buttons = !isWithinIframe() ? (
    <DashboardHeaderButtonRow
      canResetFilters={false}
      onResetFilters={_.noop}
      isPublic={true}
    />
  ) : null;

  const dashboardHasTabs = dashboard?.tabs && dashboard.tabs.length > 1;
  const hasVisibleParameters =
    headerParameters.filter((p) => !p.hidden).length > 0;

  const hiddenParameterSlugs = getTabHiddenParameterSlugs({
    parameters,
    dashboard,
    selectedTabId,
  });

  const normalizedTheme = normalizeTheme({
    theme,
    background,
  });

  const isCompactHeader = !titled && !hasVisibleParameters && !dashboardHasTabs;
  const embedToken = embeddedDashboardToken(window.location.pathname);
  const publicUuid = publicDashboardUuid(window.location.pathname);
  const assistantEndpoint = embedToken
    ? analyticsAssistantEndpoint({ token: embedToken })
    : publicUuid
      ? analyticsAssistantEndpoint({ uuid: publicUuid })
      : null;

  const frame = (
    <EmbedFrame
      name={dashboard && dashboard.name}
      description={dashboard && dashboard.description}
      dashboard={dashboard}
      parameters={headerParameters}
      parameterValues={parameterValues}
      draftParameterValues={draftParameterValues}
      hiddenParameterSlugs={hiddenParameterSlugs}
      setParameterValue={setParameterValue}
      setParameterValueToDefault={setParameterValueToDefault}
      enableParameterRequiredBehavior
      actionButtons={buttons ? <div className={CS.flex}>{buttons}</div> : null}
      dashboardTabs={dashboardId && dashboardHasTabs && <Dashboard.Tabs />}
      background={background}
      bordered={bordered}
      titled={titled}
      theme={normalizedTheme}
      hide_parameters={hideParameters}
      pdfDownloadsEnabled={downloadsEnabled.pdf}
      withFooter={withFooter}
    >
      <FullWidthContainer
        className={cx({
          [DashboardS.DashboardFullscreen]: isFullscreen,
        })}
        mt={isCompactHeader ? "xxs" : "sm"}
      >
        <Dashboard.Grid />
      </FullWidthContainer>
    </EmbedFrame>
  );

  if (!assistantEndpoint || dashboard == null) {
    return frame;
  }

  return (
    <EmbeddedDashboardWorkspace
      endpoint={assistantEndpoint}
      dashboardId={dashboard.id}
      dashboardName={dashboard.name}
      selectedTabId={typeof selectedTabId === "number" ? selectedTabId : null}
    >
      {frame}
    </EmbeddedDashboardWorkspace>
  );
}

/**
 * When both `background: false` and `theme: "transparent"` options are supplied,
 * the new behavior takes precedence (metabase#43838)
 */
function normalizeTheme({
  theme,
  background,
}: {
  theme: DisplayTheme;
  background: boolean;
}) {
  if (!background && theme === "transparent") {
    return "light";
  }

  return theme;
}
