import { analyticsAssistantPayload } from "./payload";
import { consumeWorkflowStream } from "./workflowStream";

const FALLBACK_REPLY =
  "Sorry, I could not get an answer right now. Please try again.";

function errorMessage(value: unknown): string | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const error = "error" in value ? value.error : undefined;
  const details = "details" in value ? value.details : undefined;
  if (typeof error === "string") {
    return error;
  }
  if (typeof details === "string") {
    return details;
  }
  return undefined;
}

export async function streamAnalyticsAssistant({
  endpoint,
  message,
  conversationId,
  dashboardName,
  embedUrl,
  selectedTabId,
  signal,
  onText,
  onThinking,
}: {
  endpoint: string;
  message: string;
  conversationId: string;
  dashboardName: string;
  embedUrl: string;
  selectedTabId: number | null;
  signal: AbortSignal;
  onText: (text: string) => void;
  onThinking: (text: string) => void;
}): Promise<void> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(
      analyticsAssistantPayload({
        input: message,
        conversationId,
        dashboardName,
        embedUrl,
        selectedTabId,
      }),
    ),
    signal,
  });

  if (!response.ok || !response.body) {
    let error = FALLBACK_REPLY;
    try {
      error = errorMessage(await response.json()) ?? error;
    } catch {
      // Keep the fallback reply.
    }
    onText(error);
    return;
  }

  const view = await consumeWorkflowStream(response.body, signal, (next) => {
    if (next.thinking) {
      onThinking(next.thinking);
    }
    if (next.text) {
      onText(next.text);
    } else if (next.error) {
      onText(next.error);
    }
  });

  if (signal.aborted) {
    return;
  }
  if (!view.text.trim() && !view.error) {
    onText(FALLBACK_REPLY);
  }
}
