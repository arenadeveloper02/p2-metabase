import userEvent from "@testing-library/user-event";

import { render, screen } from "__support__/ui";
import type { Parameter } from "metabase-types/api";

import { DateSingleDefaultPeriodSetting } from "./DateSingleDefaultPeriodSetting";

function setup({
  default: defaultValue,
  onChangeDefaultValue = jest.fn(),
}: {
  default?: string;
  onChangeDefaultValue?: (value: unknown) => void;
} = {}) {
  const parameter = {
    id: "1",
    name: "Date",
    slug: "date",
    type: "date/single",
    default: defaultValue,
  } as Parameter;

  render(
    <DateSingleDefaultPeriodSetting
      parameter={parameter}
      onChangeDefaultValue={onChangeDefaultValue}
    />,
  );

  return { onChangeDefaultValue };
}

describe("DateSingleDefaultPeriodSetting", () => {
  it("should set a rolling default when yesterday is selected", async () => {
    const { onChangeDefaultValue } = setup();

    await userEvent.click(screen.getByLabelText("Default period"));
    await userEvent.click(await screen.findByText("Yesterday"));

    expect(onChangeDefaultValue).toHaveBeenCalledWith("past1days");
  });

  it("should set day before yesterday as a rolling default", async () => {
    const { onChangeDefaultValue } = setup();

    await userEvent.click(screen.getByLabelText("Default period"));
    await userEvent.click(await screen.findByText("Day before yesterday"));

    expect(onChangeDefaultValue).toHaveBeenCalledWith(
      "past1days-from-1days",
    );
  });

  it("should clear the default when normal is selected", async () => {
    const { onChangeDefaultValue } = setup({ default: "past1days" });

    await userEvent.click(screen.getByLabelText("Default period"));
    await userEvent.click(await screen.findByText("Normal"));

    expect(onChangeDefaultValue).toHaveBeenCalledWith(undefined);
  });
});
