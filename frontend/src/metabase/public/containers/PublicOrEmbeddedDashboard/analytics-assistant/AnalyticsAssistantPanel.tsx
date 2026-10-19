import { type FormEvent, useEffect, useId, useRef, useState } from "react";
import { t } from "ttag";

import { AIMarkdown } from "metabase/metabot/components/AIMarkdown";
import { Button, Icon, Textarea } from "metabase/ui";

import S from "./AnalyticsAssistantPanel.module.css";
import { streamAnalyticsAssistant } from "./streamAnalyticsAssistant";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  thinking?: string;
  streaming?: boolean;
};

function nextMessageId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function newConversationId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return nextMessageId();
}

export function AnalyticsAssistantPanel({
  endpoint,
  dashboardId,
  dashboardName,
  selectedTabId,
  onClose,
}: {
  endpoint: string;
  dashboardId: number | string;
  dashboardName: string;
  selectedTabId: number | null;
  onClose: () => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const requestIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const conversationIdRef = useRef(newConversationId());
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const headingId = useId();

  useEffect(() => {
    conversationIdRef.current = newConversationId();
    setMessages([]);
  }, [dashboardId]);

  useEffect(() => {
    const node = listRef.current;
    if (!node) {
      return;
    }
    node.scrollTop = node.scrollHeight;
  }, [messages, isLoading]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const updateAssistant = (
    id: string,
    patch: Partial<Pick<ChatMessage, "text" | "thinking" | "streaming">>,
  ) => {
    setMessages((current) =>
      current.map((message) =>
        message.id === id ? { ...message, ...patch } : message,
      ),
    );
  };

  const submitQuestion = async (raw: string) => {
    const message = raw.trim();
    if (!message || isLoading) {
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const requestId = ++requestIdRef.current;
    const assistantId = nextMessageId();

    setMessages((current) => [
      ...current,
      { id: nextMessageId(), role: "user", text: message },
      {
        id: assistantId,
        role: "assistant",
        text: "",
        thinking: "",
        streaming: true,
      },
    ]);
    setDraft("");
    setIsLoading(true);

    try {
      await streamAnalyticsAssistant({
        endpoint,
        message,
        conversationId: conversationIdRef.current,
        dashboardName,
        embedUrl: window.location.href,
        selectedTabId,
        signal: controller.signal,
        onText: (text) => {
          if (requestId !== requestIdRef.current) {
            return;
          }
          updateAssistant(assistantId, { text, streaming: true });
        },
        onThinking: (thinking) => {
          if (requestId !== requestIdRef.current) {
            return;
          }
          updateAssistant(assistantId, { thinking, streaming: true });
        },
      });
      if (requestId === requestIdRef.current) {
        updateAssistant(assistantId, { streaming: false });
      }
    } catch (error) {
      if (controller.signal.aborted || requestId !== requestIdRef.current) {
        return;
      }
      const aborted = error instanceof Error && error.name === "AbortError";
      updateAssistant(assistantId, {
        streaming: false,
        text: aborted
          ? t`The request was cancelled.`
          : t`Could not reach the analytics assistant. Please try again.`,
      });
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void submitQuestion(draft);
  };

  return (
    <aside
      className={S.panel}
      aria-labelledby={headingId}
      data-testid="analytics-assistant-panel"
    >
      <header className={S.header}>
        <div className={S.input}>
          <h2 id={headingId} className={S.title}>
            {t`Analytics Assistant`}
          </h2>
          {dashboardName ? (
            <p className={S.dashboardName}>{dashboardName}</p>
          ) : null}
        </div>
        <Button
          type="button"
          variant="subtle"
          size="xs"
          aria-label={t`Close analytics assistant`}
          onClick={onClose}
        >
          <Icon name="close" size={12} />
        </Button>
      </header>
      <div ref={listRef} className={S.messages}>
        {messages.length === 0 ? (
          <p className={S.intro}>
            {t`Ask a question about this dashboard. The assistant can see the dashboard you're viewing, including the selected tab.`}
          </p>
        ) : (
          messages.map((message) =>
            message.role === "user" ? (
              <div key={message.id} className={S.user}>
                {message.text}
              </div>
            ) : (
              <div key={message.id} className={S.assistant}>
                {message.thinking ? (
                  <details className={S.thinking}>
                    <summary>{t`Thinking`}</summary>
                    <div>{message.thinking}</div>
                  </details>
                ) : null}
                {message.text ? (
                  <AIMarkdown isStreaming={message.streaming}>
                    {message.text}
                  </AIMarkdown>
                ) : message.streaming ? (
                  <span>{t`Thinking…`}</span>
                ) : null}
              </div>
            ),
          )
        )}
      </div>
      <form className={S.form} onSubmit={handleSubmit}>
        <Textarea
          className={S.input}
          aria-label={t`Ask about this dashboard`}
          placeholder={t`Ask about this dashboard`}
          value={draft}
          autosize
          minRows={1}
          maxRows={4}
          disabled={isLoading}
          onChange={(event) => setDraft(event.currentTarget.value)}
        />
        <Button
          type="submit"
          variant="filled"
          disabled={isLoading || !draft.trim()}
        >
          {t`Send`}
        </Button>
      </form>
    </aside>
  );
}
