import type { Locator } from "@playwright/test";
import type { MountResult } from "@playwright/experimental-ct-react";

/** A rectangle on screen, in CSS pixels. */
export interface Clip {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** The scroll area the header, rows and footer scroll in. */
export function scrollArea(root: MountResult): Locator {
  return root.locator(".gridkit-data-grid-tables");
}

/**
 * Scrolls the area sideways to `fraction` of the way from its start edge to
 * its end. Right to left, `scrollLeft` runs from 0 down to minus the overflow.
 */
export async function scrollSideways(
  area: Locator,
  fraction: number,
): Promise<void> {
  await area.evaluate((element, share) => {
    const overflow = element.scrollWidth - element.clientWidth;
    const rtl = getComputedStyle(element).direction === "rtl";
    element.scrollLeft = (rtl ? -overflow : overflow) * share;
  }, fraction);
}

/** The scroll area's scrollport, its scrollbars left out. */
export interface Scrollport extends Clip {
  readonly rtl: boolean;
  /** The width the pinned columns cover at the start and the end edge. */
  readonly startWidth: number;
  readonly endWidth: number;
}

/**
 * The area's scrollport. `clientLeft` takes in a vertical scrollbar on the
 * left, where a right-to-left area draws it.
 */
export async function scrollportOf(area: Locator): Promise<Scrollport> {
  return area.evaluate((element) => {
    const box = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return {
      x: box.left + element.clientLeft,
      y: box.top + element.clientTop,
      width: element.clientWidth,
      height: element.clientHeight,
      rtl: style.direction === "rtl",
      startWidth: parseFloat(
        style.getPropertyValue("--gridkit-pinned-start-width"),
      ),
      endWidth: parseFloat(
        style.getPropertyValue("--gridkit-pinned-end-width"),
      ),
    };
  });
}
