import { renderHook } from "@testing-library/react";

import type { DisplayTheme } from "metabase/embedding/types";

import { useGlobalTheme } from "./useGlobalTheme";

describe("useGlobalTheme", () => {
  afterEach(() => {
    document.documentElement.removeAttribute("data-metabase-theme");
    document.documentElement.classList.remove("dark");
  });

  it("adds the dark class when the embed theme is night", () => {
    renderHook(() => useGlobalTheme("night"));

    expect(document.documentElement).toHaveAttribute(
      "data-metabase-theme",
      "night",
    );
    expect(document.documentElement).toHaveClass("dark");
  });

  it("does not add the dark class for light or transparent themes", () => {
    const { rerender } = renderHook(
      ({ theme }: { theme: DisplayTheme }) => useGlobalTheme(theme),
      { initialProps: { theme: "light" } },
    );

    expect(document.documentElement).not.toHaveClass("dark");

    rerender({ theme: "transparent" });

    expect(document.documentElement).not.toHaveClass("dark");
    expect(document.documentElement).toHaveAttribute(
      "data-metabase-theme",
      "transparent",
    );
  });

  it("restores the previous dark class on unmount", () => {
    document.documentElement.classList.add("dark");

    const { unmount } = renderHook(() => useGlobalTheme("light"));

    expect(document.documentElement).not.toHaveClass("dark");

    unmount();

    expect(document.documentElement).toHaveClass("dark");
  });
});
