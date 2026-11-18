import type { Locator } from "@playwright/test";

/**
 * Whether `cell` is what the pointer finds at its centre and 2px inside both
 * of its inline edges: wholly in view, with no pinned column, sticky header
 * or footer over any of it.
 */
export async function isUncovered(cell: Locator): Promise<boolean> {
  return cell.evaluate((element) => {
    const box = element.getBoundingClientRect();
    const y = box.top + box.height / 2;
    return [box.left + 2, box.left + box.width / 2, box.right - 2].every(
      (x) => {
        const hit = document.elementFromPoint(x, y);
        return hit !== null && element.contains(hit);
      },
    );
  });
}
