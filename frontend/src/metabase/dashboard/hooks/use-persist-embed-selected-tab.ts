import { useEffect, useRef } from "react";

import { IS_EMBED_PREVIEW } from "metabase/lib/embed";
import { useSelector } from "metabase/lib/redux";
import { EmbedApi } from "metabase/services";

import { getDashboard, getSelectedTab } from "../selectors";
import { getDashboardType } from "../utils";

const PERSIST_DEBOUNCE_MS = 300;

/**
 * Persist the selected tab for static embeds. Requires `user_id` in the signed JWT payload.
 * Only runs when `enable_embedding` is true on the dashboard.
 */
export function usePersistEmbedSelectedTab() {
  const dashboard = useSelector(getDashboard);
  const selectedTab = useSelector(getSelectedTab);
  const dashboardId = dashboard?.id;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPersistedTabIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (
      IS_EMBED_PREVIEW ||
      !dashboardId ||
      !selectedTab ||
      getDashboardType(dashboardId) !== "embed" ||
      !dashboard?.enable_embedding
    ) {
      return;
    }

    const tabId = selectedTab.id;
    if (typeof tabId !== "number" || tabId <= 0) {
      return;
    }

    if (lastPersistedTabIdRef.current === tabId) {
      return;
    }

    timeoutRef.current = setTimeout(() => {
      EmbedApi.dashboardSelectedTab({ token: dashboardId, tab_id: tabId })
        .then(() => {
          lastPersistedTabIdRef.current = tabId;
        })
        .catch(() => {
          // Ignore persistence errors so tab switching is not blocked.
        });
    }, PERSIST_DEBOUNCE_MS);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [dashboard, dashboardId, selectedTab]);
}
