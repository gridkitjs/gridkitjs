import type { Page } from "@playwright/test";

interface TrackedWindow {
  trackedKeydownListeners: Set<unknown>;
}

/**
 * Starts tracking the `keydown` listeners added to `window` from now on, and
 * returns a reader for how many of them are still attached. A pointer gesture
 * listens there for Escape, so a count left above zero once the grid is gone
 * is a gesture that was never torn down.
 */
export async function trackWindowKeydownListeners(
  page: Page,
): Promise<() => Promise<number>> {
  await page.evaluate(() => {
    const tracked = new Set<unknown>();
    const add: EventTarget["addEventListener"] =
      window.addEventListener.bind(window);
    const remove: EventTarget["removeEventListener"] =
      window.removeEventListener.bind(window);
    Object.assign(window, {
      trackedKeydownListeners: tracked,
      addEventListener(...args: Parameters<EventTarget["addEventListener"]>) {
        if (args[0] === "keydown") {
          tracked.add(args[1]);
        }
        add(...args);
      },
      removeEventListener(
        ...args: Parameters<EventTarget["removeEventListener"]>
      ) {
        if (args[0] === "keydown") {
          tracked.delete(args[1]);
        }
        remove(...args);
      },
    });
  });
  return () =>
    page.evaluate(
      () => (window as unknown as TrackedWindow).trackedKeydownListeners.size,
    );
}
