export const ANALYTICS_ASSISTANT_OUTPUT = "dashboardchat.content";

export const ANALYTICS_ASSISTANT_BLOCK_IDS = [
  "dashboardchat",
  "dashboardchat.content",
] as const;

export function analyticsAssistantEndpoint(
  link: { token: string } | { uuid: string },
): string {
  if ("token" in link) {
    return `/api/embed/dashboard/${encodeURIComponent(link.token)}/analytics-assistant`;
  }
  return `/api/public/dashboard/${encodeURIComponent(link.uuid)}/analytics-assistant`;
}

/** Uuid from a `/public/dashboard/:uuid` link, including a site subpath. */
export function publicDashboardUuid(pathname: string): string | null {
  const match = pathname.match(/\/public\/dashboard\/([^/?#]+)/);
  if (!match?.[1]) {
    return null;
  }
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

/** Token from an `/embed/dashboard/:token` link, including a site subpath. */
export function embeddedDashboardToken(pathname: string): string | null {
  const match = pathname.match(/\/embed\/dashboard\/([^/?#]+)/);
  if (!match?.[1]) {
    return null;
  }
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}
