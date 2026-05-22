import userEvent from "@testing-library/user-event";

import { render, screen } from "__support__/ui";
import type { Parameter } from "metabase-types/api";

import { DateRangeDefaultPeriodSetting } from "./DateRangeDefaultPeriodSetting";

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
    type: "date/range",
    default: defaultValue,
  } as Parameter;

  render(
    <DateRangeDefaultPeriodSetting
      parameter={parameter}
      onChangeDefaultValue={onChangeDefaultValue}
    />,
  );

  return { onChangeDefaultValue };
}

describe("DateRangeDefaultPeriodSetting", () => {
  it("should set a rolling default when a preset is selected", async () => {
    const { onChangeDefaultValue } = setup();

    await userEvent.click(screen.getByLabelText("Default period"));
    await userEvent.click(await screen.findByText("Previous week"));

    expect(onChangeDefaultValue).toHaveBeenCalledWith("past1weeks");
  });

  it("should clear the default when normal is selected", async () => {
    const { onChangeDefaultValue } = setup({ default: "past1weeks" });

    await userEvent.click(screen.getByLabelText("Default period"));
    await userEvent.click(await screen.findByText("Normal"));

    expect(onChangeDefaultValue).toHaveBeenCalledWith(undefined);
  });
});
