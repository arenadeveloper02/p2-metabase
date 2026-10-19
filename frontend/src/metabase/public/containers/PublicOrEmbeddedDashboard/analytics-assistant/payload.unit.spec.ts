import { analyticsAssistantPayload } from "./payload";

describe("analyticsAssistantPayload", () => {
  it("sends the arena assistant input, including the selected tab id", () => {
    expect(
      analyticsAssistantPayload({
        input: "What changed this week?",
        conversationId: "conv-1",
        dashboardName: "Revenue",
        embedUrl: "https://mb.example/embed/dashboard/token",
        selectedTabId: 7,
      }),
    ).toEqual({
      input: "What changed this week?",
      conversationId: "conv-1",
      files: [],
      embedUrl: "https://mb.example/embed/dashboard/token",
      prompt: "Revenue",
      selectedTabId: 7,
    });
  });

  it("sends an empty files array and a null tab when none is selected", () => {
    expect(
      analyticsAssistantPayload({
        input: "Hi",
        conversationId: "conv-2",
        dashboardName: "Ops",
        embedUrl: "https://mb.example/embed/dashboard/token",
        selectedTabId: null,
      }).selectedTabId,
    ).toBeNull();
  });
});
