import dayjs from "dayjs";
import _userEvent from "@testing-library/user-event";

import { render, screen } from "__support__/ui";

import { DateSingleWidget } from "./DateSingleWidget";

type SetupOpts = {
  value?: string;
};

const userEvent = _userEvent.setup({
  advanceTimers: jest.advanceTimersByTime,
});

function setup({ value }: SetupOpts = {}) {
  const onChange = jest.fn();
  render(<DateSingleWidget value={value} onChange={onChange} />);
  return { onChange };
}

describe("DateSingleWidget", () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2016, 5, 7, 12, 13, 55));
    dayjs.updateLocale("en", { weekStart: 1 });
  });

  it("should allow to select a fixed date", async () => {
    const { onChange } = setup();
    const input = screen.getByLabelText("Date");
    await userEvent.clear(input);
    await userEvent.type(input, "Feb 15, 2020");
    await userEvent.click(screen.getByText("Apply"));
    expect(onChange).toHaveBeenCalledWith("2020-02-15");
  });

  it("should accept a previously selected fixed date", () => {
    setup({ value: "2020-02-15" });
    expect(screen.getByText("February 2020")).toBeInTheDocument();
  });

  it("should accept a previously selected relative date", async () => {
    const { onChange } = setup({ value: "past1days" });
    await userEvent.click(screen.getByText("Apply"));
    expect(onChange).toHaveBeenCalledWith("2016-06-06");
  });

  it("should not render a period preset dropdown", () => {
    setup();
    expect(screen.queryByLabelText("Period")).not.toBeInTheDocument();
  });
});
