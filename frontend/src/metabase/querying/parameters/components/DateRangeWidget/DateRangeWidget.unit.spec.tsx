import userEvent from "@testing-library/user-event";

import { render, screen } from "__support__/ui";

import { DateRangeWidget } from "./DateRangeWidget";

type SetupOpts = {
  value?: string;
  showRollingDefaults?: boolean;
};

function setup({ value, showRollingDefaults }: SetupOpts = {}) {
  const onChange = jest.fn();
  render(
    <DateRangeWidget
      value={value}
      onChange={onChange}
      showRollingDefaults={showRollingDefaults}
    />,
  );
  return { onChange };
}

describe("DateRangeWidget", () => {
  it("should allow to select a date range", async () => {
    const { onChange } = setup();
    const startInput = screen.getByLabelText("Start date");
    await userEvent.clear(startInput);
    await userEvent.type(startInput, "Feb 15, 2020");
    const endInput = screen.getByLabelText("End date");
    await userEvent.clear(endInput);
    await userEvent.type(endInput, "Mar 5, 2020");
    await userEvent.click(screen.getByText("Apply"));
    expect(onChange).toHaveBeenCalledWith("2020-02-15~2020-03-05");
  });

  it("should accept a previously selected date range", async () => {
    setup({ value: "2020-02-15~2020-03-05" });
    expect(screen.getByText("February 2020")).toBeInTheDocument();
  });

  it("should not show rolling defaults unless requested", () => {
    setup();
    expect(screen.queryByText("Previous month")).not.toBeInTheDocument();
  });

  it("should set a rolling default token", async () => {
    const { onChange } = setup({ showRollingDefaults: true });
    await userEvent.click(screen.getByText("Previous month"));
    expect(onChange).toHaveBeenCalledWith("previous-month");
  });
});
