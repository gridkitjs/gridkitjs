import type { Page } from "@playwright/test";

interface TrackedWindow {
  trackedWindowListeners: Set<unknown>;
}

/**
 * Starts tracking the listeners of the given event types added to `window`
 * from now on, and returns a reader for how many of them are still attached.
 * A behaviour that listens there for as long as it is open (a pointer gesture
 * for Escape, a print for the user coming back) leaves a count above zero
 * once it should be gone if it was never torn down.
 */
export async function trackWindowListeners(
  page: Page,
  eventTypes: readonly string[],
): Promise<() => Promise<number>> {
  await page.evaluate((types) => {
    const tracked = new Set<unknown>();
    const watched = new Set(types);
    const add: EventTarget["addEventListener"] =
      window.addEventListener.bind(window);
    const remove: EventTarget["removeEventListener"] =
      window.removeEventListener.bind(window);
    Object.assign(window, {
      trackedWindowListeners: tracked,
      addEventListener(...args: Parameters<EventTarget["addEventListener"]>) {
        if (watched.has(args[0])) {
          tracked.add(args[1]);
        }
        add(...args);
      },
      removeEventListener(
        ...args: Parameters<EventTarget["removeEventListener"]>
      ) {
        if (watched.has(args[0])) {
          tracked.delete(args[1]);
        }
        remove(...args);
      },
    });
  }, eventTypes);
  return () =>
    page.evaluate(
      () => (window as unknown as TrackedWindow).trackedWindowListeners.size,
    );
}
