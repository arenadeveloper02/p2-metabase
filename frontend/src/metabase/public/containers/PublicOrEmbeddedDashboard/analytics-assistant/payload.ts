export type AnalyticsAssistantPayload = {
  input: string;
  conversationId: string;
  files: readonly unknown[];
  embedUrl: string;
  prompt: string;
  selectedTabId: number | null;
};

export function analyticsAssistantPayload({
  input,
  conversationId,
  dashboardName,
  embedUrl,
  selectedTabId,
}: {
  input: string;
  conversationId: string;
  dashboardName: string;
  embedUrl: string;
  selectedTabId: number | null;
}): AnalyticsAssistantPayload {
  return {
    input,
    conversationId,
    files: [],
    embedUrl,
    prompt: dashboardName,
    selectedTabId,
  };
}
