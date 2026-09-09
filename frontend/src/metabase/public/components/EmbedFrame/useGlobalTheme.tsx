import { useEffect } from "react";

import type { DisplayTheme } from "metabase/embedding/types";
import { isEmbeddingSdk } from "metabase/embedding-sdk/config";

export function useGlobalTheme(theme: DisplayTheme | undefined) {
  useEffect(() => {
    // We don't want to modify user application DOM when using the SDK.
    if (isEmbeddingSdk() || theme == null) {
      return;
    }

    const element = document.documentElement;

    const originalTheme = element.getAttribute("data-metabase-theme");
    const hadDarkClass = element.classList.contains("dark");

    element.setAttribute("data-metabase-theme", theme);
    element.classList.toggle("dark", theme === "night");

    return () => {
      if (originalTheme == null) {
        element.removeAttribute("data-metabase-theme");
      } else {
        element.setAttribute("data-metabase-theme", originalTheme);
      }

      element.classList.toggle("dark", hadDarkClass);
    };
  }, [theme]);
}
