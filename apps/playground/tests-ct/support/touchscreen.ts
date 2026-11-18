import type { CDPSession, Page } from "@playwright/test";

export interface Point {
  readonly x: number;
  readonly y: number;
}

/**
 * Why a test that moves a finger skips outside Chromium. Playwright's
 * `page.touchscreen` only taps; a touch that rests or moves is driven
 * through the DevTools protocol, which only Chromium speaks.
 */
export const TOUCH_DRAG_UNAVAILABLE =
  "Playwright drives a moving or resting touch in Chromium alone";

/** Whether `touchDrag` and `touchPress` can drive this browser. */
export function canDriveTouch(browserName: string): boolean {
  return browserName === "chromium";
}

async function session(page: Page): Promise<CDPSession> {
  return page.context().newCDPSession(page);
}

/**
 * Puts a finger down at `point` and returns the function that lifts it: a
 * real touch, with the pointer events, scrolling and `contextmenu` the
 * browser derives from one.
 */
export async function touchPress(
  page: Page,
  point: Point,
): Promise<() => Promise<void>> {
  const cdp = await session(page);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [point],
  });
  return async () => {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await cdp.detach();
  };
}

/**
 * Drags a finger from `from` to `to` in even steps and lifts it, as a
 * person swiping does. The browser decides what the swipe does: scroll,
 * or the gesture of whatever took the pointer.
 */
export async function touchDrag(
  page: Page,
  from: Point,
  to: Point,
  steps = 10,
): Promise<void> {
  const cdp = await session(page);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [from],
  });
  for (let step = 1; step <= steps; step += 1) {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [
        {
          x: from.x + ((to.x - from.x) * step) / steps,
          y: from.y + ((to.y - from.y) * step) / steps,
        },
      ],
    });
  }
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await cdp.detach();
}
