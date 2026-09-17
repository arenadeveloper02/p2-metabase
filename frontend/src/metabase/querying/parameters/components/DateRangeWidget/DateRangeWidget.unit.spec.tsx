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

function getVisibleDay(label: string) {
  return screen
    .getAllByLabelText(label)
    .find((day) => day.getAttribute("data-hidden") !== "true");
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

  it("should fill the date range and wait for Apply before committing a rolling default", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2025-03-12T15:00:00"));
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const { onChange } = setup({ showRollingDefaults: true });

    await user.click(screen.getByText("Previous month"));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Start date")).toHaveValue("February 1, 2025");
    expect(screen.getByLabelText("End date")).toHaveValue("February 28, 2025");
    expect(getVisibleDay("1 February 2025")).toHaveAttribute(
      "data-selected",
      "true",
    );
    expect(getVisibleDay("28 February 2025")).toHaveAttribute(
      "data-selected",
      "true",
    );

    await user.click(screen.getByText("Apply"));
    expect(onChange).toHaveBeenCalledWith("previous-month");

    jest.useRealTimers();
  });

  it("should use Monday-Sunday weeks for previous week shortcuts", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2025-03-12T15:00:00"));
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const { onChange } = setup({ showRollingDefaults: true });

    await user.click(screen.getByText("Previous week"));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Start date")).toHaveValue("March 3, 2025");
    expect(screen.getByLabelText("End date")).toHaveValue("March 9, 2025");
    expect(getVisibleDay("3 March 2025")).toHaveAttribute(
      "data-selected",
      "true",
    );
    expect(getVisibleDay("9 March 2025")).toHaveAttribute(
      "data-selected",
      "true",
    );

    await user.click(screen.getByText("Apply"));
    expect(onChange).toHaveBeenCalledWith("previous-week");

    jest.useRealTimers();
  });
});
