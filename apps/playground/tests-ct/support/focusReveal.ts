import type { Page } from "@playwright/test";

/**
 * Waits until the browser has scrolled the element just focused by Tab into
 * view. WebKit does that in its next rendering update rather than when focus
 * moves, so a key pressed straight after Tab that scrolls the same container,
 * as End does in a long checklist, has its scroll undone a frame later. Two
 * frames are past that update in every browser.
 */
export async function waitForFocusReveal(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      }),
  );
}
