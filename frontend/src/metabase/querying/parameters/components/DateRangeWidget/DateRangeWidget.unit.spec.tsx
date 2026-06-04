import dayjs from "dayjs";
import _userEvent from "@testing-library/user-event";

import { render, screen } from "__support__/ui";

import { DateRangeWidget } from "./DateRangeWidget";

type SetupOpts = {
  value?: string;
};

const userEvent = _userEvent.setup({
  advanceTimers: jest.advanceTimersByTime,
});

function setup({ value }: SetupOpts = {}) {
  const onChange = jest.fn();
  render(<DateRangeWidget value={value} onChange={onChange} />);
  return { onChange };
}

describe("DateRangeWidget", () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2016, 5, 7, 12, 13, 55));
    dayjs.updateLocale("en", { weekStart: 1 });
  });

  it("should allow to select a fixed date range", async () => {
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

  it("should accept a previously selected fixed date range", () => {
    setup({ value: "2020-02-15~2020-03-05" });
    expect(screen.getByText("February 2020")).toBeInTheDocument();
  });

  it("should resolve a previously selected relative date range on apply", async () => {
    const { onChange } = setup({ value: "past1weeks" });
    await userEvent.click(screen.getByText("Apply"));
    expect(onChange).toHaveBeenCalledWith("2016-05-30~2016-06-05");
  });

  it("should resolve previous month presets on apply", async () => {
    const { onChange } = setup({ value: "past1months" });
    await userEvent.click(screen.getByText("Apply"));
    expect(onChange).toHaveBeenCalledWith("2016-05-01~2016-05-31");
  });

  it("should not render a period preset dropdown", () => {
    setup();
    expect(screen.queryByLabelText("Period")).not.toBeInTheDocument();
  });
});
