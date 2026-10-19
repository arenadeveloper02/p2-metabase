import { ANALYTICS_ASSISTANT_BLOCK_IDS } from "./constants";

const ASSISTANT_BLOCK_IDS: ReadonlySet<string> = new Set(
  ANALYTICS_ASSISTANT_BLOCK_IDS,
);

export type AnalyticsStreamView = {
  text: string;
  thinking: string;
  error: string;
};

type Block = {
  answer: string;
  thinking: string;
};

type RunState = {
  blocks: Map<string, Block>;
  error: string;
  done: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function emptyState(): RunState {
  return { blocks: new Map(), error: "", done: false };
}

function block(state: RunState, blockId: string): Block {
  const existing = state.blocks.get(blockId);
  if (existing) {
    return existing;
  }
  const created = { answer: "", thinking: "" };
  state.blocks.set(blockId, created);
  return created;
}

function applyFrame(state: RunState, value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  if (!("event" in value) && typeof value.chunk === "string") {
    const blockId = value.blockId;
    if (typeof blockId !== "string") {
      return false;
    }
    const current = block(state, blockId);
    current.answer += value.chunk;
    return false;
  }

  if (typeof value.event !== "string") {
    return false;
  }

  if (value.event === "thinking") {
    const blockId = value.blockId;
    if (typeof blockId !== "string" || typeof value.data !== "string") {
      return false;
    }
    const current = block(state, blockId);
    current.thinking += value.data;
    return false;
  }

  if (value.event === "error") {
    state.error =
      typeof value.error === "string" ? value.error : "The run failed.";
    return true;
  }

  if (value.event === "final") {
    const data = isRecord(value.data) ? value.data : null;
    if (data?.success === false) {
      state.error =
        typeof data.error === "string" && data.error
          ? data.error
          : "The workflow failed.";
    }
    return true;
  }

  return false;
}

function applyData(state: RunState, raw: string): boolean {
  const trimmed = raw.trim();
  if (trimmed === "[DONE]") {
    state.done = true;
    return true;
  }
  try {
    const value: unknown = JSON.parse(trimmed);
    if (value === "[DONE]") {
      state.done = true;
      return true;
    }
    return applyFrame(state, value);
  } catch {
    state.error = state.error || "Invalid JSON in stream frame";
    return false;
  }
}

export function reduceWorkflowText(text: string): AnalyticsStreamView {
  const state = emptyState();
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  for (const line of lines) {
    if (!line.startsWith("data: ")) {
      continue;
    }
    if (applyData(state, line.slice("data: ".length))) {
      break;
    }
  }
  return viewFromState(state);
}

function viewFromState(state: RunState): AnalyticsStreamView {
  const preferred: string[] = [];
  const preferredThinking: string[] = [];
  const all: string[] = [];
  const allThinking: string[] = [];
  for (const [blockId, current] of state.blocks) {
    const answer = current.answer.trim();
    const thinking = current.thinking.trim();
    if (answer) {
      all.push(answer);
    }
    if (thinking) {
      allThinking.push(thinking);
    }
    if (ASSISTANT_BLOCK_IDS.has(blockId)) {
      if (answer) {
        preferred.push(answer);
      }
      if (thinking) {
        preferredThinking.push(thinking);
      }
    }
  }
  return {
    text: (preferred.length > 0 ? preferred : all).join("\n\n"),
    thinking: (preferredThinking.length > 0
      ? preferredThinking
      : allThinking
    ).join("\n\n"),
    error: state.error,
  };
}

export async function consumeWorkflowStream(
  body: ReadableStream<Uint8Array>,
  signal: AbortSignal,
  onUpdate: (view: AnalyticsStreamView) => void,
): Promise<AnalyticsStreamView> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  const state = emptyState();
  let buffer = "";
  let released = false;

  const publish = () => {
    onUpdate(viewFromState(state));
  };

  const release = async () => {
    if (released) {
      return;
    }
    released = true;
    await reader.cancel().catch(() => undefined);
  };

  const take = (chunk: string, final: boolean) => {
    buffer += chunk.replace(/\r\n?/g, "\n");
    const lines = buffer.split("\n");
    buffer = final ? "" : (lines.pop() ?? "");
    for (const line of final
      ? lines.filter((line) => line.length > 0)
      : lines) {
      if (!line.startsWith("data: ")) {
        continue;
      }
      if (applyData(state, line.slice("data: ".length))) {
        return true;
      }
    }
    return false;
  };

  try {
    while (!signal.aborted) {
      const { value, done } = await reader.read();
      if (done) {
        take(decoder.decode(), true);
        publish();
        return viewFromState(state);
      }
      const stop = take(decoder.decode(value, { stream: true }), false);
      publish();
      if (stop || signal.aborted) {
        await release();
        return viewFromState(state);
      }
    }
    return viewFromState(state);
  } finally {
    if (!released) {
      try {
        reader.releaseLock();
      } catch {
        // The reader was already cancelled.
      }
    }
  }
}
