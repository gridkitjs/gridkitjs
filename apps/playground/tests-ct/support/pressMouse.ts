import type { Page } from "@playwright/test";

/**
 * Presses `page.mouse`'s button where the mouse is, and returns the
 * `pointerId` the browser gave the press. Browsers number the mouse
 * differently — Firefox counts from 0, Chromium and WebKit from 1 — so a
 * spec that names the mouse's pointer takes it from here.
 */
export async function pressMouse(page: Page): Promise<number> {
  await page.evaluate(() => {
    window.addEventListener(
      "pointerdown",
      (event) => {
        document.documentElement.dataset.pressedPointerId = String(
          event.pointerId,
        );
      },
      { capture: true, once: true },
    );
  });
  await page.mouse.down();
  return Number(
    await page.evaluate(
      () => document.documentElement.dataset.pressedPointerId,
    ),
  );
}
