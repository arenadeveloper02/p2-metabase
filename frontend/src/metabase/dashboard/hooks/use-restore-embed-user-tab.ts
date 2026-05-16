import type { Location } from "history";
import { useEffect, useRef } from "react";

import { IS_EMBED_PREVIEW } from "metabase/lib/embed";
import { useDispatch, useSelector } from "metabase/lib/redux";
import { EmbedApi } from "metabase/services";

import { selectTab } from "../actions";
import { getDashboard, getSelectedTab, getTabs } from "../selectors";
import { getDashboardType, parseTabSlug } from "../utils";

/**
 * When loading a static embed without `?tab=` in the URL, restore the tab saved for the JWT `user_id`.
 */
export function useRestoreEmbedUserTab(location: Location) {
  const dispatch = useDispatch();
  const dashboard = useSelector(getDashboard);
  const tabs = useSelector(getTabs);
  const selectedTab = useSelector(getSelectedTab);
  const dashboardId = dashboard?.id;
  const restoredRef = useRef<number | string | null>(null);

  useEffect(() => {
    if (
      IS_EMBED_PREVIEW ||
      !dashboardId ||
      !dashboard?.enable_embedding ||
      getDashboardType(dashboardId) !== "embed" ||
      tabs.length <= 1
    ) {
      return;
    }

    if (restoredRef.current === dashboardId) {
      return;
    }

    if (parseTabSlug(location) != null) {
      restoredRef.current = dashboardId;
      return;
    }

    let cancelled = false;

    EmbedApi.dashboardLastTab({ token: dashboardId })
      .then((result: { tab_id?: number; tab_slug?: string } | null) => {
        if (cancelled || !result?.tab_id) {
          return;
        }

        const tabId = result.tab_id;
        const isValidTab = tabs.some(
          (tab) => tab.id === tabId && tab.is_shown !== false,
        );

        if (isValidTab && selectedTab?.id !== tabId) {
          dispatch(selectTab({ tabId }));
        }
      })
      .catch(() => {
        // No saved tab or missing user_id in JWT — fall back to first tab.
      })
      .finally(() => {
        if (!cancelled) {
          restoredRef.current = dashboardId;
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    dashboard,
    dashboardId,
    dispatch,
    location,
    selectedTab?.id,
    tabs,
  ]);
}
