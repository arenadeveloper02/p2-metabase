import userEvent from "@testing-library/user-event";

import { render, screen } from "__support__/ui";

import { DateSingleWidget } from "./DateSingleWidget";

type SetupOpts = {
  value?: string;
  showRollingDefaults?: boolean;
};

function setup({ value, showRollingDefaults }: SetupOpts = {}) {
  const onChange = jest.fn();
  render(
    <DateSingleWidget
      value={value}
      onChange={onChange}
      showRollingDefaults={showRollingDefaults}
    />,
  );
  return { onChange };
}

describe("DateSingleWidget", () => {
  it("should allow to select a date", async () => {
    const { onChange } = setup();
    const input = screen.getByLabelText("Date");
    await userEvent.clear(input);
    await userEvent.type(input, "Feb 15, 2020");
    await userEvent.click(screen.getByText("Apply"));
    expect(onChange).toHaveBeenCalledWith("2020-02-15");
  });

  it("should accept a previously selected date", async () => {
    setup({ value: "2020-02-15" });
    expect(screen.getByText("February 2020")).toBeInTheDocument();
  });

  it("should not show rolling defaults unless requested", () => {
    setup();
    expect(screen.queryByText("Yesterday")).not.toBeInTheDocument();
  });

  it("should set a rolling default token", async () => {
    const { onChange } = setup({ showRollingDefaults: true });
    await userEvent.click(screen.getByText("Yesterday"));
    expect(onChange).toHaveBeenCalledWith("yesterday");
  });
});
