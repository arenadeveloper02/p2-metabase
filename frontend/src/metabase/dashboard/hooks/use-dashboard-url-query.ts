import type { Location } from "history";
import { useEffect, useMemo, useRef } from "react";
import type { InjectedRouter } from "react-router";
import { push, replace } from "react-router-redux";
import { usePrevious } from "react-use";
import _ from "underscore";

import { useSetting } from "metabase/common/hooks";
import { EMBED_EXTERNAL_USER_ID_QUERY_PARAM } from "metabase/embedding/constants";
import { IS_EMBED_PREVIEW } from "metabase/lib/embed";
import { useDispatch, useSelector } from "metabase/lib/redux";
import * as Urls from "metabase/lib/urls";
import { getParameterValuesBySlug } from "metabase-lib/v1/parameters/utils/parameter-values";

import { selectTab } from "../actions";
import {
  getDashboard,
  getSelectedTab,
  getTabs,
  getValuePopulatedParameters,
} from "../selectors";
import { createTabSlug } from "../utils";

export function useDashboardUrlQuery(
  router: InjectedRouter,
  location: Location,
) {
  const dashboardId = useSelector((state) => getDashboard(state)?.id);
  const tabs = useSelector(getTabs);
  const selectedTab = useSelector(getSelectedTab);
  const parameters = useSelector(getValuePopulatedParameters);
  const siteUrl = useSetting("site-url");

  const dispatch = useDispatch();
  const restoredDashboardIdRef = useRef<number | string | null>(null);

  const parameterValuesBySlug = useMemo(
    () => getParameterValuesBySlug(parameters),
    [parameters],
  );

  const queryParams = useMemo(() => {
    const queryParams = { ...parameterValuesBySlug };

    const hasRealSelectedTab = selectedTab && selectedTab.id > 0;
    if (hasRealSelectedTab && tabs.length > 1) {
      queryParams.tab = createTabSlug(selectedTab);
    }

    return queryParams;
  }, [parameterValuesBySlug, tabs, selectedTab]);

  const previousQueryParams = usePrevious(queryParams);

  const externalUserId = location.query?.[EMBED_EXTERNAL_USER_ID_QUERY_PARAM];
  const hasExternalUserId =
    typeof externalUserId === "string" && externalUserId.length > 0;

  useEffect(() => {
    if (!dashboardId || !selectedTab || hasExternalUserId) {
      return;
    }

    const hasRealSelectedTab = selectedTab.id > 0;
    if (!hasRealSelectedTab) {
      return;
    }

    try {
      window.sessionStorage.setItem(
        getDashboardTabSessionKey(dashboardId),
        String(selectedTab.id),
      );
    } catch {
      // Ignore storage errors (private browsing, security policies, etc.)
    }
  }, [dashboardId, selectedTab, hasExternalUserId]);

  useEffect(() => {
    if (!dashboardId || tabs.length <= 1) {
      return;
    }

    if (restoredDashboardIdRef.current === dashboardId) {
      return;
    }

    const tabInUrl = parseTabId(location);
    if (tabInUrl != null) {
      restoredDashboardIdRef.current = dashboardId;
      return;
    }

    if (hasExternalUserId) {
      restoredDashboardIdRef.current = dashboardId;
      return;
    }

    let savedTabId: number | null = null;
    try {
      const value = window.sessionStorage.getItem(
        getDashboardTabSessionKey(dashboardId),
      );
      savedTabId = value != null ? parseInt(value, 10) : null;
    } catch {
      restoredDashboardIdRef.current = dashboardId;
      return;
    }

    const isValidTab =
      savedTabId != null &&
      Number.isSafeInteger(savedTabId) &&
      tabs.some((tab) => tab.id === savedTabId && tab.is_shown !== false);

    if (isValidTab && selectedTab?.id !== savedTabId) {
      dispatch(selectTab({ tabId: savedTabId }));
    }

    restoredDashboardIdRef.current = dashboardId;
  }, [dashboardId, tabs, location, selectedTab, dispatch, hasExternalUserId]);

  useEffect(() => {
    /**
     * We don't want to sync the query string to the URL because when previewing,
     * this changes the URL of the iframe by appending the query string to the src.
     * This causes the iframe to reload when changing the preview hash from appearance
     * settings because now the base URL (including the query string) is different.
     */
    if (IS_EMBED_PREVIEW || !dashboardId) {
      return;
    }

    const pathname = location.pathname.replace(siteUrl, "");
    const isDashboardUrl = pathname.startsWith("/dashboard/");
    if (isDashboardUrl) {
      const dashboardSlug = pathname.replace("/dashboard/", "");
      const dashboardUrlId = Urls.extractEntityId(dashboardSlug);
      const isNavigationInProgress = dashboardId !== dashboardUrlId;
      if (isNavigationInProgress) {
        return;
      }
    }

    if (_.isEqual(previousQueryParams, queryParams)) {
      return;
    }

    const currentQuery = location?.query ?? {};

    const nextQueryParams = toLocationQuery(queryParams);
    const currentQueryParams = _.omit(currentQuery, ...QUERY_PARAMS_ALLOW_LIST);

    if (!_.isEqual(nextQueryParams, currentQueryParams)) {
      const otherQueryParams = _.pick(currentQuery, ...QUERY_PARAMS_ALLOW_LIST);
      const nextQuery = { ...otherQueryParams, ...nextQueryParams };

      const isDashboardTabChange =
        queryParams &&
        previousQueryParams?.tab &&
        queryParams.tab !== previousQueryParams.tab;

      const action = isDashboardTabChange ? push : replace;
      dispatch(action({ ...location, query: nextQuery }));
    }
  }, [
    dashboardId,
    queryParams,
    previousQueryParams,
    location,
    siteUrl,
    dispatch,
  ]);

  useEffect(() => {
    // @ts-expect-error missing type declaration
    const unsubscribe = router.listen((nextLocation) => {
      const isSamePath = nextLocation.pathname === location.pathname;
      if (!isSamePath) {
        return;
      }

      const currentTabId = parseTabId(location);
      const nextTabId = parseTabId(nextLocation);

      if (nextTabId && currentTabId !== nextTabId) {
        dispatch(selectTab({ tabId: nextTabId }));
      }
    });

    return () => unsubscribe();
  }, [router, location, selectedTab, dispatch]);
}

const QUERY_PARAMS_ALLOW_LIST = [
  "objectId",
  EMBED_EXTERNAL_USER_ID_QUERY_PARAM,
];

function parseTabId(location: Location) {
  const slug = location.query?.tab;
  if (typeof slug === "string" && slug.length > 0) {
    const id = parseInt(slug, 10);
    return Number.isSafeInteger(id) ? id : null;
  }
  return null;
}

function toLocationQuery(object: Record<string, any>) {
  return _.mapObject(object, (value) => (value == null ? "" : value));
}

function getDashboardTabSessionKey(dashboardId: number | string) {
  return `mb:dashboard:selected-tab:${dashboardId}`;
}
