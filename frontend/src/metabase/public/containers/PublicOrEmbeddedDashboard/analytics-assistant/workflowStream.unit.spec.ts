import { reduceWorkflowText } from "./workflowStream";

describe("reduceWorkflowText", () => {
  it("keeps dashboardchat content and thinking, and stops at DONE", () => {
    const transcript = [
      'data: {"event":"thinking","blockId":"dashboardchat.content","data":"Checking the tab."}',
      'data: {"blockId":"other","chunk":"ignore me"}',
      'data: {"blockId":"dashboardchat.content","chunk":"Revenue is up."}',
      "data: [DONE]",
      'data: {"blockId":"dashboardchat.content","chunk":"too late"}',
    ].join("\n");

    expect(reduceWorkflowText(transcript)).toEqual({
      text: "Revenue is up.",
      thinking: "Checking the tab.",
      error: "",
    });
  });
});
