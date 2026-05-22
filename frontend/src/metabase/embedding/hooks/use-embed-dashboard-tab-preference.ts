import type { Location } from "history";
import { useEffect, useRef } from "react";

import { selectTab } from "metabase/dashboard/actions";
import { getSelectedTab, getTabs } from "metabase/dashboard/selectors";
import { isJWT } from "metabase/lib/utils";
import { useDispatch, useSelector } from "metabase/lib/redux";
import { EmbedApi } from "metabase/services";

import { EMBED_EXTERNAL_USER_ID_QUERY_PARAM } from "../constants";

function parseTabId(location: Location) {
  const slug = location.query?.tab;
  if (typeof slug === "string" && slug.length > 0) {
    const id = parseInt(slug, 10);
    return Number.isSafeInteger(id) ? id : null;
  }
  return null;
}

function getExternalUserId(location: Location) {
  const value = location.query?.[EMBED_EXTERNAL_USER_ID_QUERY_PARAM];
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function useEmbedDashboardTabPreference(location: Location) {
  const dispatch = useDispatch();
  const embedToken = useSelector((state) => {
    const id = state.dashboard.dashboardId;
    return typeof id === "string" && isJWT(id) ? id : null;
  });
  const tabs = useSelector(getTabs);
  const selectedTab = useSelector(getSelectedTab);
  const restoredRef = useRef<string | null>(null);
  const lastSavedTabIdRef = useRef<number | null>(null);

  const externalUserId = getExternalUserId(location);

  useEffect(() => {
    if (!embedToken || !externalUserId || tabs.length <= 1) {
      return;
    }

    const restoreKey = `${embedToken}:${externalUserId}`;
    if (restoredRef.current === restoreKey) {
      return;
    }

    if (parseTabId(location) != null) {
      restoredRef.current = restoreKey;
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const response = await EmbedApi.dashboardTabPreference({
          token: embedToken,
          external_user_id: externalUserId,
        });

        if (cancelled) {
          return;
        }

        const tabId = response?.tab_id;
        const isValidTab =
          tabId != null &&
          tabs.some((tab) => tab.id === tabId && tab.is_shown !== false);

        if (isValidTab && selectedTab?.id !== tabId) {
          dispatch(selectTab({ tabId }));
        }
      } catch {
        // Ignore preference load errors (network, invalid token, etc.)
      } finally {
        if (!cancelled) {
          restoredRef.current = restoreKey;
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    dispatch,
    embedToken,
    externalUserId,
    location,
    selectedTab?.id,
    tabs,
  ]);

  useEffect(() => {
    if (!embedToken || !externalUserId || !selectedTab) {
      return;
    }

    const hasRealSelectedTab = selectedTab.id > 0;
    if (!hasRealSelectedTab) {
      return;
    }

    if (lastSavedTabIdRef.current === selectedTab.id) {
      return;
    }

    lastSavedTabIdRef.current = selectedTab.id;

    EmbedApi.saveDashboardTabPreference({
      token: embedToken,
      external_user_id: externalUserId,
      tab_id: selectedTab.id,
    }).catch(() => {
      lastSavedTabIdRef.current = null;
    });
  }, [embedToken, externalUserId, selectedTab]);
}
