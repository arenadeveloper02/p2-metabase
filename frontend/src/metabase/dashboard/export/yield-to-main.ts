/** Yields to the browser so long PDF prep work does not freeze the tab. */
export const yieldToMain = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      setTimeout(resolve, 0);
    });
  });
