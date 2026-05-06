import userEvent from "@testing-library/user-event";
import dayjs from "dayjs";

import { render, screen } from "__support__/ui";
import "metabase/lib/dayjs";

import { DateRangeWidget } from "./DateRangeWidget";

type SetupOpts = {
  value?: string;
  defaultPreset?: "last-completed-week" | "previous-week";
};

function setup({ value, defaultPreset }: SetupOpts = {}) {
  const onChange = jest.fn();
  render(
    <DateRangeWidget
      value={value}
      defaultPreset={defaultPreset}
      onChange={onChange}
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

  it("should default current date range to last completed week", async () => {
    const { onChange } = setup({ defaultPreset: "last-completed-week" });
    await userEvent.click(screen.getByText("Apply"));
    const start = dayjs().startOf("isoWeek").subtract(1, "week");
    const end = start.add(6, "day");
    expect(onChange).toHaveBeenCalledWith(
      `${start.format("YYYY-MM-DD")}~${end.format("YYYY-MM-DD")}`,
    );
  });

  it("should default to last completed week when preset is omitted", async () => {
    const { onChange } = setup();
    await userEvent.click(screen.getByText("Apply"));
    const start = dayjs().startOf("isoWeek").subtract(1, "week");
    const end = start.add(6, "day");
    expect(onChange).toHaveBeenCalledWith(
      `${start.format("YYYY-MM-DD")}~${end.format("YYYY-MM-DD")}`,
    );
  });

  it("should default previous date range to the week before last", async () => {
    const { onChange } = setup({ defaultPreset: "previous-week" });
    await userEvent.click(screen.getByText("Apply"));
    const start = dayjs().startOf("isoWeek").subtract(2, "week");
    const end = start.add(6, "day");
    expect(onChange).toHaveBeenCalledWith(
      `${start.format("YYYY-MM-DD")}~${end.format("YYYY-MM-DD")}`,
    );
  });
});
