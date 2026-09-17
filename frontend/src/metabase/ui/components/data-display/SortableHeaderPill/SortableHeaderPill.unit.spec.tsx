import { render, screen } from "@testing-library/react";

import { SortableHeaderPill } from "./SortableHeaderPill";

describe("SortableHeaderPill", () => {
  it("renders the full header name without an ellipsis tooltip", () => {
    render(<SortableHeaderPill name="Very long dashboard column header" />);

    expect(
      screen.getByText("Very long dashboard column header"),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("ellipsified-tooltip")).not.toBeInTheDocument();
  });
});
